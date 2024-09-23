package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.BRANCH,
    subcommands = {
        BranchAddSubcommand.class,
        BranchCloneSubcommand.class,
        BranchDeleteSubcommand.class,
        BranchListSubcommand.class,
        BranchMergeSubcommand.class,
        BranchEditSubcommand.class
    }
)
class BranchSubcommand extends HelpCommand {
    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.BRANCH);
    }
}
