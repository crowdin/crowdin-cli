package com.crowdin.cli;

import com.crowdin.cli.commands.picocli.PicocliRunner;

import java.net.Authenticator;
import java.net.PasswordAuthentication;

public class Cli {

    public static void main(String[] args) {
        try {
            setSystemProperties();

            PicocliRunner picocliRunner = PicocliRunner.getInstance();
            int exitCode = picocliRunner.execute(args);
            if (exitCode != -1 && !picocliRunner.hasMatchedArg("plain")) {
                picocliRunner.execute("check-new-version");
            }

            System.exit(exitCode);
        } catch (Exception e) {
            System.out.println("There is exception:");
            e.printStackTrace();
        }
    }

    private static void setSystemProperties() {
        if (System.getenv("HTTP_PROXY_HOST") != null) {
            System.setProperty("http.proxyHost", System.getenv("HTTP_PROXY_HOST"));
            System.setProperty("https.proxyHost", System.getenv("HTTP_PROXY_HOST"));
        }
        if (System.getenv("HTTP_PROXY_PORT") != null) {
            System.setProperty("http.proxyPort", System.getenv("HTTP_PROXY_PORT"));
            System.setProperty("https.proxyPort", System.getenv("HTTP_PROXY_PORT"));
        }
        String proxyUser = System.getenv("HTTP_PROXY_USER");
        String proxyPassword = System.getenv("HTTP_PROXY_PASSWORD");

        if (proxyUser != null && proxyPassword != null) {
            Authenticator.setDefault(
                new Authenticator() {
                    @Override
                    public PasswordAuthentication getPasswordAuthentication() {
                        if (getRequestorType() == RequestorType.PROXY) {
                            return new PasswordAuthentication(proxyUser, proxyPassword.toCharArray());
                        } else {
                            return null;
                        }
                    }
                }
            );
            System.setProperty("jdk.http.auth.tunneling.disabledSchemes", "");
        }
    }
}
