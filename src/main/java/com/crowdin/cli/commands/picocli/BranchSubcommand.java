package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.BRANCH,
    subcommands = {
        BranchAddSubcommand.class,
        BranchDeleteSubcommand.class,
        BranchListSubcommand.class
    }
)
class BranchSubcommand extends HelpCommand {
    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.BRANCH);
    }
}
