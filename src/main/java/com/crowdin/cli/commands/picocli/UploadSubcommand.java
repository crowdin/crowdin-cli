package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.UPLOAD,
    aliases = CommandNames.ALIAS_UPLOAD,
    sortOptions = false,
    subcommands = {
        UploadTranslationsSubcommand.class,
        UploadSourcesSubcommand.class
    })
class UploadSubcommand extends UploadSourcesCommand {

}
