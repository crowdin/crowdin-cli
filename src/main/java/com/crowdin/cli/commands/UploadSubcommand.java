package com.crowdin.cli.commands;

import com.crowdin.cli.commands.parts.UploadSourcesCommand;
import picocli.CommandLine;

@CommandLine.Command(
    name = "upload",
    aliases = "push",
    customSynopsis = "@|fg(yellow) crowdin |@(@|fg(yellow) upload|@|@|fg(yellow) push|@) [SUBCOMMAND] [CONFIG OPTIONS] [OPTIONS]",
    description = "Upload source files to the Crowdin project",
    subcommands = {
        UploadTranslationsSubcommand.class,
        UploadSourcesSubcommand.class
    })
public class UploadSubcommand extends UploadSourcesCommand {


}
