package com.crowdin.cli.commands;

import com.crowdin.cli.commands.parts.UploadSourcesCommand;
import picocli.CommandLine;

@CommandLine.Command(
        name = "upload",
        aliases = "push",
        description = "Upload source files to the Crowdin project",
        subcommands = {
            UploadTranslationsSubcommand.class,
            UploadSourcesSubcommand.class
        })
public class UploadSubcommand extends UploadSourcesCommand {


}
