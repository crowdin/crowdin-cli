package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.CONFIG,
    subcommands = {
        ConfigSourcesSubcommand.class,
        ConfigTranslationsSubcommand.class
    }
)
class ConfigSubcommand extends HelpCommand {

    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.CONFIG);
    }
}
