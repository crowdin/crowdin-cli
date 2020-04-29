package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = "list",
    subcommands = {
        ListProjectSubcommand.class,
        ListSourcesSubcommand.class,
        ListTranslationsSubcommand.class
    })
public class ListSubcommand extends HelpCommand {
    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get("list");
    }
}
