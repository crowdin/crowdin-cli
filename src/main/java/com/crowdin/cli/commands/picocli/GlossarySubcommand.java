package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.GLOSSARY,
    subcommands = {
        GlossaryListSubcommand.class,
        GlossaryUploadSubcommand.class,
        GlossaryDownloadSubcommand.class
    }
)
public class GlossarySubcommand extends HelpCommand {
    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.GLOSSARY);
    }
}
