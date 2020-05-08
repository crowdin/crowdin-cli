package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name ="sources",
        sortOptions = false
)
public class UploadSourcesSubcommand implements Runnable {

    @CommandLine.Mixin
    private UploadSourcesCommand uploadSourcesCommand;

    @Override
    public void run() {
        uploadSourcesCommand.run();
    }
}
