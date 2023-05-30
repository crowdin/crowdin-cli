package com.crowdin.cli.client;

import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.core.http.impl.json.JacksonJsonTransformer;
import com.crowdin.client.core.model.ClientConfig;
import com.crowdin.client.core.model.Credentials;

import java.net.Authenticator;
import java.net.PasswordAuthentication;

public final class Clients {

    private Clients() {}

    public static NoClient noClient() {
        return new NoClient() {

        };
    }

    public static ClientGlossary getClientGlossary(String apiToken, String baseUrl) {
        com.crowdin.client.Client client = prepareClient(apiToken, baseUrl);
        return new CrowdinClientGlossary(client);
    }

    public static ClientTm getClientTm(String apiToken, String baseUrl) {
        com.crowdin.client.Client client = prepareClient(apiToken, baseUrl);
        return new CrowdinClientTm(client);
    }

    public static ClientTask getClientTask(String apiToken, String baseUrl, String projectId) {
        com.crowdin.client.Client client = prepareClient(apiToken, baseUrl);
        return new CrowdinClientTask(client, projectId);
    }

    public static ClientComment getClientComment(String apiToken, String baseUrl, String projectId) {
        com.crowdin.client.Client client = prepareClient(apiToken, baseUrl);
        return new CrowdinClientComment(client, projectId);
    }

    public static ClientBundle getClientBundle(String apiToken, String baseUrl, String projectId) {
        com.crowdin.client.Client client = prepareClient(apiToken, baseUrl);
        return new CrowdinClientBundle(client, projectId);
    }

//    mb divide args to move token and url to constructor?
    public static ProjectClient getProjectClient(String apiToken, String baseUrl, long projectId) {
        com.crowdin.client.Client client = prepareClient(apiToken, baseUrl);
        return new CrowdinProjectClient(client, projectId);
    }

    public static com.crowdin.client.Client prepareClient(String apiToken, String baseUrl) {
        boolean isTesting = PropertiesBeanUtils.isUrlForTesting(baseUrl);
        String organization = PropertiesBeanUtils.getOrganization(baseUrl);
        Credentials credentials = (isTesting)
            ? new Credentials(apiToken, organization, baseUrl)
            : new Credentials(apiToken, organization);
        ClientConfig clientConfig = ClientConfig.builder()
            .jsonTransformer(new JacksonJsonTransformer())
            .userAgent(Utils.buildUserAgent())
            .build();
        Utils.proxyHost()
            .map(pair -> new ClientConfig.Host(pair.getKey(), pair.getValue()))
            .ifPresent(proxy -> {
                clientConfig.setProxy(proxy);

                System.setProperty("https.proxyHost", proxy.getHost());
                System.setProperty("https.proxyPort", String.valueOf(proxy.getPort()));
            });
        Utils.proxyCredentials()
            .map(pair -> new ClientConfig.UsernamePasswordCredentials(pair.getKey(), pair.getValue()))
            .ifPresent(proxyCreds -> {
                clientConfig.setProxyCreds(proxyCreds);
                if (proxyCreds.getUsername() != null && proxyCreds.getPassword() != null) {
                    Authenticator.setDefault(
                        new Authenticator() {
                            @Override
                            public PasswordAuthentication getPasswordAuthentication() {
                                if (getRequestorType() == RequestorType.PROXY) {
                                    return new PasswordAuthentication(proxyCreds.getUsername(), proxyCreds.getPassword().toCharArray());
                                } else {
                                    return null;
                                }
                            }
                        }
                    );
                    System.setProperty("jdk.http.auth.tunneling.disabledSchemes", "");
                }
            });
        return new com.crowdin.client.Client(credentials, clientConfig);
    }
}
