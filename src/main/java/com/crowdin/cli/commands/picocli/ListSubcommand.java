package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.LIST,
    subcommands = {
        ListSourcesSubcommand.class,
        ListTranslationsSubcommand.class
    })
class ListSubcommand extends HelpCommand {
    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get("list");
    }
}
