package com.crowdin.cli.commands;

import picocli.CommandLine;

@CommandLine.Command(name ="upload translations")
public class UploadTranslationsSubcommand extends GeneralCommand {
    @Override
    public Integer call() throws Exception {
        System.out.println("UploadTranslationsSubcommand");
        return null;
    }
}
