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

    @CommandLine.Option(names = {"-T", "--token"}, paramLabel = "...", descriptionKey = "params.token", order = -2)
    private String token;

    @CommandLine.Option(names = {"--base-url"}, paramLabel = "...", descriptionKey = "params.base-url", order = -2)
    private String baseUrl;

    @CommandLine.Option(names = {"--base-path"}, paramLabel = "...", descriptionKey = "params.base-path", order = -2)
    private String basePath;

    @CommandLine.Option(names = {"-i", "--project-id"}, paramLabel = "...", descriptionKey = "params.project-id", order = -2)
    private String projectId;

    @CommandLine.Option(names = {"-s", "--source"}, paramLabel = "...", descriptionKey = "params.source", order = -2)
    private String source;

    @CommandLine.Option(names = {"-t", "--translation"}, paramLabel = "...", descriptionKey = "params.translation", order = -2)
    private String translation;

    @CommandLine.Option(names = {"--preserve-hierarchy"}, negatable = true, paramLabel = "...", descriptionKey = "params.preserve-hierarchy", order = -2)
    private Boolean preserveHierarchy;

    @CommandLine.Option(names = {"-d", "--destination"}, paramLabel = "...", descriptionKey = "crowdin.generate.destination", defaultValue = "crowdin.yml", order = -2)
    private Path destinationPath;

    @CommandLine.Option(names = "--skip-generate-description", hidden = true, order = -2)
    private boolean skipGenerateDescription;

    protected NewAction<NoProperties, NoClient> getAction(Actions actions) {
        return actions.generate(new FsFiles(), token, baseUrl, basePath, projectId, source, translation, preserveHierarchy, destinationPath, skipGenerateDescription);
    }

    protected NoProperties getProperties(PropertiesBuilders propertiesBuilders, Outputter out) {
        return propertiesBuilders.buildNoProperties();
    }

    protected NoClient getClient(NoProperties properties) {
        return Clients.noClient();
    }
}