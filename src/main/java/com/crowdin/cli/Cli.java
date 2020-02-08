package com.crowdin.cli;

import com.crowdin.cli.commands.RootCommand;
import com.crowdin.cli.commands.parts.HelpCommand;
import picocli.CommandLine;

public class Cli {

    public static void main(String[] args) {
        try {
            CommandLine.Help.ColorScheme colorScheme = new CommandLine.Help.ColorScheme.Builder()
                .commands(CommandLine.Help.Ansi.Style.fg_yellow)
                .options(CommandLine.Help.Ansi.Style.fg_yellow)
                .build();
            CommandLine.IExecutionExceptionHandler executionExceptionHandler = (ex, cmd, pr) -> {
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
            CommandLine commandLine = new CommandLine(new RootCommand())
                .setExecutionExceptionHandler(executionExceptionHandler)
                .setColorScheme(colorScheme);

            HelpCommand.setOptions(System.out, colorScheme);
            int exitCode = commandLine.execute(args);
        } catch (Exception e) {
            System.out.println("There is exception:");
            e.printStackTrace();
        }
    }
}
