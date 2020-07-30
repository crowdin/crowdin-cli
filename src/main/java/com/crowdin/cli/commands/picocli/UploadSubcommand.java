package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = "upload",
    aliases = "push",
    sortOptions = false,
    subcommands = {
        UploadTranslationsSubcommand.class,
        UploadSourcesSubcommand.class
    })
class UploadSubcommand extends UploadSourcesCommand {

}
