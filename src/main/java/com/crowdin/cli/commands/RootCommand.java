package com.crowdin.cli.commands;

import com.crowdin.cli.commands.parts.HelpCommand;
import picocli.CommandLine;

@CommandLine.Command(
    name = "crowdin",
    customSynopsis = "@|fg(yellow) crowdin|@ [SUBCOMMAND] [OPTIONS]",
    description = "Crowdin CLI is a command-line tool that allows you to manage and synchronize localization resources with your Crowdin project. " +
            "\nThis tool requires you to create a configuration file. For more details see https://support.crowdin.com/configuration-file-v3/",
    subcommands = {
        UploadSubcommand.class,
        DownloadSubcommand.class,
        ListSubcommand.class,
        LintSubcommand.class,
        GenerateSubcommand.class
    })
public class RootCommand extends HelpCommand {
}
