package com.crowdin.cli.utils.http;

import lombok.Data;
import org.apache.commons.codec.binary.Base64;
import org.json.JSONException;
import org.json.JSONObject;

import java.awt.Desktop;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.BaseCli.URL_OAUTH_AUTH;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

public class OAuthUtil {

    public static String getToken(String clientId) {
        try {
            int port = 46221;
            String redirectUri = String.format("http://localhost:%d/callback", port);
            BlockingQueue<Result> queue = new ArrayBlockingQueue<>(1);

            SimpleHttpServer server = new SimpleHttpServer(ServerSocketFactory.standard(), port, true);
            server.addListener("/callback", (request, responseOut) -> {

                String responseText = RESOURCE_BUNDLE.getString("message.html_page.main_text_exception");
                Result result;
                if (request.getParams().containsKey("access_token") && request.getParams().containsKey("expires_in")) {
                    String accessToken = request.getParams().get("access_token");
                    int expiresIn = Integer.parseInt(request.getParams().get("expires_in"));
                    result = new Result(accessToken, expiresIn);
                    responseText = RESOURCE_BUNDLE.getString("message.html_page.main_text_successful");
                } else if (request.getParams().containsKey("error")) {
                    result = new Result(new RuntimeException(
                        String.format(RESOURCE_BUNDLE.getString("error.error_response"), URL_OAUTH_AUTH, request.getParams().get("error"))));
                } else {
                    result = new Result(new RuntimeException(
                        String.format(RESOURCE_BUNDLE.getString("error.unexpected_response"), URL_OAUTH_AUTH, request)));
                }
                HttpResponse
                    .ok(String.format(RESOURCE_BUNDLE.getString("message.html_page.body"),
                        RESOURCE_BUNDLE.getString("message.html_page.title"),
                        responseText,
                        RESOURCE_BUNDLE.getString("message.html_page.close_page_text")))
                    .send(responseOut);
                queue.add(result);

            });
            server.setDaemon(true);

            server.start();

            String builtUrl = String.format(URL_OAUTH_AUTH, clientId, redirectUri);
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(new URI(builtUrl));
            } else {
                System.out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("message.warning.browser_not_found"), builtUrl)));
            }

            Result result = queue.take();
            server.close();

            if (result.getToken() != null) {
                return result.getToken();
            } else if (result.getException() != null) {
                throw result.getException();
            } else {
                throw new RuntimeException("Unexpected error");
            }
        } catch (Exception e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.in_local_server"), e);
        }
    }

    @Data
    private static class Result {
        private String token;
        private int expiresIn;
        private Exception exception;

        public Result(String token, int expiresIn) {
            this.token = token;
            this.expiresIn = expiresIn;
        }

        public Result(Exception exception) {
            this.exception = exception;
        }
    }

    public static String getDomainFromToken(String token) {
        String[] parts = token.split("\\.");
        for (String part : parts) {
            try {
                String decoded = new String(Base64.decodeBase64(part.getBytes(StandardCharsets.UTF_8)), StandardCharsets.UTF_8);
                JSONObject decodedJson = new JSONObject(decoded);
                if (decodedJson.has("domain")) {
                    return decodedJson.getString("domain");
                }
            } catch (JSONException ignore) {
//                do nothing
            }
        }
        return null;
    }
}
