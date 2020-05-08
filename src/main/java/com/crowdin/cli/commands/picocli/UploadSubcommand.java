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
public class UploadSubcommand implements Runnable {

    @CommandLine.Mixin
    private UploadSourcesCommand uploadSourcesCommand;

    @Override
    public void run() {
        uploadSourcesCommand.run();
    }
}
