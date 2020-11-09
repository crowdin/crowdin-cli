package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

import java.io.PrintStream;

public abstract class HelpCommand extends GenericCommand {

    private static PrintStream stream;
    private static CommandLine.Help.ColorScheme colorScheme;
    private static CommandLine rootCommand;

    public static void setOptions(CommandLine rootCommand, PrintStream stream, CommandLine.Help.ColorScheme colorScheme) {
        HelpCommand.rootCommand = rootCommand;
        HelpCommand.stream = stream;
        HelpCommand.colorScheme = colorScheme;
    }

    @Override
    public final void run() {
        getCommand(rootCommand).usage(stream, colorScheme);
    }

    protected abstract CommandLine getCommand(CommandLine rootCommand);
}
