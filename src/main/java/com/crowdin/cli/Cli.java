package com.crowdin.cli;

import com.crowdin.cli.commands.RootCommand;
import com.crowdin.cli.commands.parts.HelpCommand;
import com.crowdin.cli.utils.Utils;
import picocli.CommandLine;

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
        }
        if (System.getenv("HTTP_PROXY_PORT") != null) {
            System.setProperty("http.proxyPort", System.getenv("HTTP_PROXY_PORT"));
        }
        if (System.getenv("HTTPS_PROXY_HOST") != null) {
            System.setProperty("https.proxyHost", System.getenv("HTTPS_PROXY_HOST"));
        }
        if (System.getenv("HTTPS_PROXY_PORT") != null) {
            System.setProperty("https.proxyPort", System.getenv("HTTPS_PROXY_PORT"));
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
                cmd.getErr().println(ex.getMessage());
                Throwable cause = ex;
                while ((cause = cause.getCause()) != null) {
                    cmd.getErr().println(cause.getMessage());
                }
            }
            return cmd.getExitCodeExceptionMapper() != null
                    ? cmd.getExitCodeExceptionMapper().getExitCode(ex)
                    : cmd.getCommandSpec().exitCodeOnExecutionException();
        };
    }
}
