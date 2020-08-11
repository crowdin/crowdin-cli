package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Action;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.functionality.FsFiles;
import picocli.CommandLine;

import java.nio.file.Path;

@CommandLine.Command(
    name = CommandNames.GENERATE,
    aliases = CommandNames.ALIAS_GENERATE)
class GenerateSubcommand extends ActCommand {

    @CommandLine.Option(names = {"-d", "--destination"}, paramLabel = "...", defaultValue = "crowdin.yml")
    private Path destinationPath;

    @CommandLine.Option(names = "--skip-generate-description", hidden = true)
    private boolean skipGenerateDescription;

    @Override
    protected Action getAction(Actions actions) {
        return actions.generate(new FsFiles(), destinationPath, skipGenerateDescription);
    }
}