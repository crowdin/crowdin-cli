package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Clients;
import com.crowdin.cli.client.NoClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.cli.properties.NoProperties;
import com.crowdin.cli.properties.PropertiesBuilders;
import picocli.CommandLine;

import java.nio.file.Path;

@CommandLine.Command(
    name = CommandNames.GENERATE,
    aliases = CommandNames.ALIAS_GENERATE)
public class GenerateSubcommand extends GenericActCommand<NoProperties, NoClient> {

    @CommandLine.Option(names = {"-d", "--destination"}, paramLabel = "...", defaultValue = "crowdin.yml")
    private Path destinationPath;

    @CommandLine.Option(names = "--skip-generate-description", hidden = true)
    private boolean skipGenerateDescription;

    protected NewAction<NoProperties, NoClient> getAction(Actions actions) {
        return actions.generate(new FsFiles(), destinationPath, skipGenerateDescription);
    }

    protected NoProperties getProperties(PropertiesBuilders propertiesBuilders, Outputter out) {
        return propertiesBuilders.buildNoProperties();
    }

    protected NoClient getClient(NoProperties properties) {
        return Clients.noClient();
    }
}