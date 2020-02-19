package com.crowdin.cli.commands;

import com.crowdin.cli.commands.parts.HelpCommand;
import picocli.CommandLine;

@CommandLine.Command(
    name = "list",
    subcommands = {
        ListProjectSubcommand.class,
        ListSourcesSubcommand.class,
        ListTranslationsSubcommand.class
    })
public class ListSubcommand extends HelpCommand {
}
