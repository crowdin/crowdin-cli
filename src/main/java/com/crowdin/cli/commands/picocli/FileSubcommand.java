package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;
import picocli.CommandLine.Command;

@Command(
    name = CommandNames.FILE,
    subcommands = {
        ScreenshotListSubcommand.class,
        ScreenshotUploadSubcommand.class,
        ScreenshotDeleteSubcommand.class
    }
)
class FileSubcommand extends HelpCommand {

    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.FILE);
    }
}
