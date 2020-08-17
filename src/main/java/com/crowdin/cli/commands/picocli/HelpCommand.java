package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.Outputter;
import picocli.CommandLine;

import java.io.PrintStream;

abstract class HelpCommand extends GenericCommand {

    private static PrintStream out;
    private static CommandLine.Help.ColorScheme colorScheme;
    private static CommandLine rootCommand;

    public static void setOptions(CommandLine rootCommand, PrintStream out, CommandLine.Help.ColorScheme colorScheme) {
        HelpCommand.rootCommand = rootCommand;
        HelpCommand.out = out;
        HelpCommand.colorScheme = colorScheme;
    }

    @Override
    public void act(Actions actions, Outputter outputter) {
        getCommand(rootCommand).usage(out, colorScheme);
    }

    protected abstract CommandLine getCommand(CommandLine rootCommand);
}
