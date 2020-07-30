package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.actions.Action;
import com.crowdin.cli.commands.actions.GenerateAction;
import picocli.CommandLine;

import java.nio.file.Path;

@CommandLine.Command(
    name = "generate",
    aliases = "init")
class GenerateSubcommand extends ActCommand {

    @CommandLine.Option(names = {"-d", "--destination"}, paramLabel = "...", defaultValue = "crowdin.yml")
    private Path destinationPath;

    @CommandLine.Option(names = "--skip-generate-description", hidden = true)
    private boolean skipGenerateDescription;

    @Override
    protected Action getAction() {
        return new GenerateAction(destinationPath, skipGenerateDescription);
    }
}