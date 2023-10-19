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

    @CommandLine.Option(names = {"-T", "--token"}, paramLabel = "...", descriptionKey = "params.token")
    private String token;

    @CommandLine.Option(names = {"--base-url"}, paramLabel = "...", descriptionKey = "params.base-url")
    private String baseUrl;

    @CommandLine.Option(names = {"--base-path"}, paramLabel = "...", descriptionKey = "params.base-path")
    private String basePath;

    @CommandLine.Option(names = {"-i", "--project-id"}, paramLabel = "...", descriptionKey = "params.project-id")
    private String projectId;

    @CommandLine.Option(names = {"-s", "--source"}, paramLabel = "...", descriptionKey = "params.source")
    private String source;

    @CommandLine.Option(names = {"-t", "--translation"}, paramLabel = "...", descriptionKey = "params.translation")
    private String translation;

    @CommandLine.Option(names = {"--dest"}, paramLabel = "...", descriptionKey = "params.dest")
    private String dest;

    @CommandLine.Option(names = {"--preserve-hierarchy"}, negatable = true, paramLabel = "...", descriptionKey = "params.preserve-hierarchy")
    private Boolean preserveHierarchy;

    @CommandLine.Option(names = {"-d", "--config-dest"}, paramLabel = "...", defaultValue = "crowdin.yml")
    private Path configDestPath;

    @CommandLine.Option(names = "--skip-generate-description", hidden = true)
    private boolean skipGenerateDescription;

    protected NewAction<NoProperties, NoClient> getAction(Actions actions) {
        return actions.generate(new FsFiles(), token, baseUrl, basePath, projectId, source, translation, dest, preserveHierarchy, configDestPath, skipGenerateDescription);
    }

    protected NoProperties getProperties(PropertiesBuilders propertiesBuilders, Outputter out) {
        return propertiesBuilders.buildNoProperties();
    }

    protected NoClient getClient(NoProperties properties) {
        return Clients.noClient();
    }
}