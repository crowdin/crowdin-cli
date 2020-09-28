package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = "crowdin",
    subcommands = {
        UploadSubcommand.class,
        DownloadSubcommand.class,
        ListSubcommand.class,
        LintSubcommand.class,
        GenerateSubcommand.class,
        StatusSubcommand.class,
        StringSubcommand.class,
        GlossarySubcommand.class,
        TmSubcommand.class,
        CheckNewVersionSubcommand.class
    })
class RootCommand extends HelpCommand {
    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand;
    }
}
