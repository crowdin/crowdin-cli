package com.crowdin.cli.commands;

import com.crowdin.cli.commands.parts.UploadSourcesCommand;
import picocli.CommandLine;

@CommandLine.Command(
    name ="sources",
    description = "Uploads source files to Crowdin project",
    customSynopsis = "@|fg(yellow) crowdin |@(@|fg(yellow) upload|@|@|fg(yellow) push|@) @|fg(yellow) sources|@ [CONFIG OPTIONS] [OPTIONS]"
)
public class UploadSourcesSubcommand extends UploadSourcesCommand {
}
