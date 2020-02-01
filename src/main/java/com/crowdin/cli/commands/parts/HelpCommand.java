package com.crowdin.cli.commands.parts;

import picocli.CommandLine;

import java.io.PrintStream;

public abstract class HelpCommand extends Command {

    private static PrintStream out;
    private static CommandLine.Help.ColorScheme colorScheme;

    public static void setOptions(PrintStream out, CommandLine.Help.ColorScheme colorScheme) {
        HelpCommand.out = out;
        HelpCommand.colorScheme = colorScheme;
    }

    @Override
    public void run() {
        CommandLine.usage(this, out, colorScheme);
    }
}
