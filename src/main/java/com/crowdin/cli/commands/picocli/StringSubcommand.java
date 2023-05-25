package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.STRING,
    subcommands = {
        StringListSubcommand.class,
        StringAddSubcommand.class,
        StringCommentSubcommand.class,
        StringDeleteSubcommand.class,
        StringEditSubcommand.class
    }
)
class StringSubcommand extends HelpCommand {
    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get("string");
    }
}
