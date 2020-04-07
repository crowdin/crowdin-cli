package com.crowdin.cli.commands.parts;

import com.crowdin.cli.commands.RootCommand;
import picocli.CommandLine;

import java.io.PrintStream;

public abstract class HelpCommand extends Command {

    private static PrintStream out;
    private static CommandLine.Help.ColorScheme colorScheme;
    private static CommandLine rootCommand;

    public static void setOptions(CommandLine rootCommand, PrintStream out, CommandLine.Help.ColorScheme colorScheme) {
        HelpCommand.rootCommand = rootCommand;
        HelpCommand.out = out;
        HelpCommand.colorScheme = colorScheme;
    }

    @Override
    public void run() {
        getCommand(rootCommand).usage(out, colorScheme);
    }

    protected abstract CommandLine getCommand(CommandLine rootCommand);
}
