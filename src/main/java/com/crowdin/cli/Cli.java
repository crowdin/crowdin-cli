package com.crowdin.cli;

import com.crowdin.cli.commands.*;
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
            CommandLine commandLine = new CommandLine(new GeneralCommand())
                .addSubcommand("upload", new CommandLine(new UploadSubcommand())
                    .addSubcommand("sources", new UploadSourcesSubcommand())
                    .addSubcommand("translations", new UploadTranslationsSubcommand()))
                .addSubcommand("download", new DownloadSubcommand())
                .addSubcommand("list", new CommandLine(new ListSubcommand())
                    .addSubcommand("sources", new  ListSourcesSubcommand())
                    .addSubcommand("translations", new ListTranslationsSubcommand())
                    .addSubcommand("project", new ListProjectSubcommand()))
                .addSubcommand("lint", new LintSubcommand())
                .addSubcommand("generate", new GenerateSubcommand());
            int exitCode = commandLine.setColorScheme(colorScheme).execute(args);
        } catch (Exception e) {
            System.out.println("There is exception:");
            e.printStackTrace();
        }
    }
}
