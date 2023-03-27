package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.BUNDLE,
    subcommands = {
        BundleListSubcommand.class,
        BundleAddSubcommand.class
    }
)
class BundleSubcommand extends HelpCommand {

    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.BUNDLE);
    }
}
