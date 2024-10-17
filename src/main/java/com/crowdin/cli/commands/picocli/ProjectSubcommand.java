package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.PROJECT,
    subcommands = {
        ProjectBrowseSubcommand.class,
        ProjectListSubcommand.class,
        ProjectAddSubcommand.class
    }
)
class ProjectSubcommand extends HelpCommand {
    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.PROJECT);
    }
}
