package com.crowdin.cli;

import com.crowdin.cli.commands.RootCommand;
import com.crowdin.cli.commands.parts.HelpCommand;
import com.crowdin.cli.utils.Utils;
import picocli.CommandLine;

import java.net.Authenticator;
import java.net.PasswordAuthentication;

import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;

public class Cli {

    public static void main(String[] args) {
        try {
            setSystemProperties();
            CommandLine.Help.ColorScheme colorScheme = buildColorScheme();
            CommandLine.IExecutionExceptionHandler executionExceptionHandler = buildExecutionExceptionHandler();
            CommandLine commandLine = new CommandLine(new RootCommand())
                .setExecutionExceptionHandler(executionExceptionHandler)
                .setColorScheme(colorScheme);

            HelpCommand.setOptions(System.out, colorScheme);
            int exitCode = commandLine.execute(args);

            Utils.getNewVersionMassage().ifPresent(System.out::println);

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

    private static CommandLine.Help.ColorScheme buildColorScheme() {
        return new CommandLine.Help.ColorScheme.Builder()
                .commands(CommandLine.Help.Ansi.Style.fg_yellow)
                .options(CommandLine.Help.Ansi.Style.fg_yellow)
                .build();
    }

    private static CommandLine.IExecutionExceptionHandler buildExecutionExceptionHandler() {
        return (ex, cmd, pr) -> {
            if (pr.originalArgs().contains("--debug")) {
                ex.printStackTrace();
            } else {
                cmd.getErr().println(ERROR.withIcon(ex.getMessage()));
                Throwable cause = ex;
                while ((cause = cause.getCause()) != null) {
                    cmd.getErr().println(ERROR.withIcon(cause.getMessage()));
                }
            }
            return cmd.getExitCodeExceptionMapper() != null
                    ? cmd.getExitCodeExceptionMapper().getExitCode(ex)
                    : cmd.getCommandSpec().exitCodeOnExecutionException();
        };
    }
}
