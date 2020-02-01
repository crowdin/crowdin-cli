package com.crowdin.cli.commands;

import com.crowdin.cli.commands.parts.HelpCommand;
import picocli.CommandLine;

@CommandLine.Command(
    name = "crowdin",
    description = "Crowdin CLI is a command line tool that allows you to manage and synchronize your localization resources with a Crowdin project. " +
        "This tool requires you to create the configuration file. See https://support.crowdin.com/configuration-file-v3/ for more details.",
    subcommands = {
        UploadSubcommand.class,
        DownloadSubcommand.class,
        ListSubcommand.class,
        LintSubcommand.class,
        GenerateSubcommand.class
    })
public class RootCommand extends HelpCommand {
}
