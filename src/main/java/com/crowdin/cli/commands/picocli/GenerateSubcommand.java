package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.actions.GenerateAction;
import picocli.CommandLine;

import java.nio.file.Path;

@CommandLine.Command(
    name = "generate",
    aliases = "init")
public class GenerateSubcommand extends Command {

    @CommandLine.Option(names = {"-d", "--destination"}, paramLabel = "...", defaultValue = "crowdin.yml")
    private Path destinationPath;

    @CommandLine.Option(names = "--skip-generate-description", hidden = true)
    private boolean skipGenerateDescription;

    @Override
    public void run() {
        GenerateAction action = new GenerateAction(destinationPath, skipGenerateDescription);
        action.act();
    }
}