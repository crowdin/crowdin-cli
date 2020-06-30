package com.crowdin.cli.utils;

import com.crowdin.cli.utils.http.HttpResponse;
import com.crowdin.cli.utils.http.ServerSocketFactory;
import com.crowdin.cli.utils.http.SimpleHttpServer;
import lombok.Data;
import org.apache.commons.codec.binary.Base64;
import org.apache.http.NameValuePair;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.util.EntityUtils;
import org.json.JSONException;
import org.json.JSONObject;

import java.awt.*;
import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

import static com.crowdin.cli.BaseCli.*;

public class OAuthUtil {

    public static String getToken(String clientId, String clientSecret) {
        try {
            int port = 46221;
            String redirectUri = String.format("http://localhost:%d/callback", port);
            BlockingQueue<Result> queue = new ArrayBlockingQueue<>(1);

            SimpleHttpServer server = new SimpleHttpServer(ServerSocketFactory.standard(), port, true);
            server.addListener("/callback", (request, responseOut) -> {
                HttpResponse.redirect("https://crowdin.com/").send(responseOut);
                responseOut.close();
                Result result;

                if (request.getParams().containsKey("code")) {
                    String code = request.getParams().get("code");
                    JSONObject tokenResponse = requestAccessToken(clientId, clientSecret, redirectUri, code);
                    if (tokenResponse.has("access_token") && tokenResponse.has("refresh_token") && tokenResponse.has("expires_in")) {
                        result = new Result(
                            tokenResponse.getString("access_token"),
                            tokenResponse.getString("refresh_token"),
                            tokenResponse.getInt("expires_in"));
                    } else {
                        result = new Result(new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.unexpected_response"), URL_OAUTH_TOKEN, tokenResponse)));
                    }
                } else if (request.getParams().containsKey("error")) {
                    result = new Result(new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.error_response"), URL_OAUTH_AUTH, request.getParams().get("error"))));
                } else {
                    result = new Result(new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.unexpected_response"), URL_OAUTH_AUTH, request)));
                }
                queue.add(result);

            });
            server.setDaemon(true);

            server.start();

            String builtUrl = String.format(URL_OAUTH_AUTH, clientId, redirectUri);
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(new URI(builtUrl));
            }

            Result result = queue.take();
            server.close();

            if (result.getException() != null) {
                throw result.getException();
            } else {
                return result.getToken();
            }
        } catch (Exception e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.in_local_server"), e);
        }
    }

    @Data
    public static class Result {
        private String token;
        private String refreshToken;
        private int expiresInt;
        private Exception exception;

        public Result(String token, String refreshToken, int expiresInt) {
            this.token = token;
            this.refreshToken = refreshToken;
            this.expiresInt = expiresInt;
        }

        public Result(Exception exception) {
            this.exception = exception;
        }
    }

    private static JSONObject requestAccessToken(String clientId, String clientSecret, String redirectUri, String code) {
        java.util.List<NameValuePair> body = new ArrayList<NameValuePair>() {{
            add(new BasicNameValuePair("grant_type", "authorization_code"));
            add(new BasicNameValuePair("client_id", clientId));
            add(new BasicNameValuePair("client_secret", clientSecret));
            add(new BasicNameValuePair("redirect_uri", redirectUri));
            add(new BasicNameValuePair("code", code));
        }};
        return send(body);
    }

    private static JSONObject requestRefreshToken(String clientId, String clientSecret, String redirectUri, String refreshToken) {
        java.util.List<NameValuePair> body = new ArrayList<NameValuePair>() {{
            add(new BasicNameValuePair("grant_type", "refresh_token"));
            add(new BasicNameValuePair("client_id", clientId));
            add(new BasicNameValuePair("client_secret", clientSecret));
            add(new BasicNameValuePair("redirect_uri", redirectUri));
            add(new BasicNameValuePair("refresh_token", refreshToken));
        }};
        return send(body);
    }

    private static JSONObject send(List<? extends NameValuePair> body) {
        HttpPost tokenRequest = new HttpPost(URL_OAUTH_TOKEN);
        try {
            tokenRequest.setEntity(new UrlEncodedFormEntity(body));
        } catch (IOException e) {
            throw new RuntimeException("Error while encoding", e);
        }

        try (CloseableHttpClient httpClient = HttpClients.createDefault();
             CloseableHttpResponse response = httpClient.execute(tokenRequest)) {
            return new JSONObject(EntityUtils.toString(response.getEntity()));
        } catch (IOException e) {
            throw new RuntimeException("Error while processing second request", e);
        }
    }

    public static String getDomainFromToken(String token) {
        String[] parts = token.split("\\.");
        for (String part : parts) {
            try {
                String decoded = new String(Base64.decodeBase64(part.getBytes()));
                JSONObject decodedJson = new JSONObject(decoded);
                if (decodedJson.has("domain")) {
                    return decodedJson.getString("domain");
                }
            } catch (JSONException ignore) {
            }
        }
        return null;
    }
}
