package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.UPLOAD_SOURCES,
    sortOptions = false
)
class UploadSourcesSubcommand extends UploadSourcesCommand {

}
