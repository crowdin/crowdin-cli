package com.crowdin.cli;

import com.crowdin.cli.commands.RootCommand;
import com.crowdin.cli.commands.parts.HelpCommand;
import picocli.CommandLine;
//import org.apache.commons.cli.CommandLine;
//import org.apache.commons.cli.CommandLineParser;
//import org.apache.commons.cli.DefaultParser;
//import org.apache.commons.cli.Options;

public class Cli {

    public static void main(String[] args) {
        try {
            CommandLine.Help.ColorScheme colorScheme = new CommandLine.Help.ColorScheme.Builder()
                .commands(CommandLine.Help.Ansi.Style.fg_yellow)
                .options(CommandLine.Help.Ansi.Style.fg_yellow)
                .build();
            CommandLine commandLine = new CommandLine(new RootCommand())
                    .setColorScheme(colorScheme);

            HelpCommand.setOptions(System.out, colorScheme);
            int exitCode = commandLine.execute(args);
        } catch (Exception e) {
            System.out.println("There is exception:");
            e.printStackTrace();
        }
    }
}
