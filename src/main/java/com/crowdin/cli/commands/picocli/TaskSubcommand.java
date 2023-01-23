package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.TASK,
    subcommands = {
        TaskListSubcommand.class,
        TaskAddSubcommand.class
    }
)
class TaskSubcommand extends HelpCommand {

    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.TASK);
    }
}
