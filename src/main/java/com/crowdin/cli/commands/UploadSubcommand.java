package com.crowdin.cli.commands;

import picocli.CommandLine;

import java.util.concurrent.Callable;

@CommandLine.Command(name = "upload", aliases = "push", description = "Upload source files and existing translations to the Crowdin project")
public class UploadSubcommand extends GeneralCommand {
    @Override
    public Integer call() throws Exception {
        System.out.println("UploadSubcommand");
        return null;
    }
}
