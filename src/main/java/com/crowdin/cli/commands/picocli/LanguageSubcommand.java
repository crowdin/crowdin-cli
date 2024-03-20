package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.LANGUAGE,
    subcommands = {
        LanguageListSubcommand.class
    }
)
class LanguageSubcommand extends HelpCommand {
    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.LANGUAGE);
    }
}
