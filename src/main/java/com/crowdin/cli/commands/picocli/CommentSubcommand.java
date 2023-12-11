package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.COMMENT,
    subcommands = {
        CommentListSubcommand.class,
        CommentResolveSubcommand.class
    }
)
class CommentSubcommand extends HelpCommand {

    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.COMMENT);
    }
}
