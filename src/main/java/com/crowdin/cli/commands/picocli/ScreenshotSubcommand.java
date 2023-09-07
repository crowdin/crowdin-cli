package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;
import picocli.CommandLine.Command;

@Command(
    name = CommandNames.SCREENSHOT,
    subcommands = {
        ScreenshotListSubcommand.class,
        ScreenshotUploadSubcommand.class,
        ScreenshotDeleteSubcommand.class
    }
)
class ScreenshotSubcommand extends HelpCommand {

    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.SCREENSHOT);
    }
}
