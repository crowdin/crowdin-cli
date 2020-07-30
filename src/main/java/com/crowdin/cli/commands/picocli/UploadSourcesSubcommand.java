package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = "sources",
        sortOptions = false
)
class UploadSourcesSubcommand extends UploadSourcesCommand {

}
