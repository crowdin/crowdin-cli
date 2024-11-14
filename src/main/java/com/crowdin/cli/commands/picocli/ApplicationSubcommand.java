package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
        name = CommandNames.APP,
        subcommands = {
                AppListSubcommand.class,
                AppInstallSubcommand.class,
                AppUninstallSubcommand.class
        }
)
class ApplicationSubcommand extends HelpCommand {

    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.APP);
    }
}
