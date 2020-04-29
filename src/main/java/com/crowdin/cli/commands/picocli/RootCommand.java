package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = "crowdin",
    subcommands = {
        UploadSubcommand.class,
        DownloadSubcommand.class,
        ListSubcommand.class,
        LintSubcommand.class,
        GenerateSubcommand.class
    })
public class RootCommand extends HelpCommand {
    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand;
    }
}
