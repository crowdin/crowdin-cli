package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.DISTRIBUTION,
    subcommands = {
        DistributionAddSubcommand.class,
        DistributionListSubcommand.class,
        DistributionReleaseSubcommand.class
    }
)
class DistributionSubcommand extends HelpCommand {

    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.DISTRIBUTION);
    }
}
