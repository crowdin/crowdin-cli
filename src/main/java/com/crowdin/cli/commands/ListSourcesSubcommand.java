package com.crowdin.cli.commands;

import com.crowdin.cli.commands.functionality.DryrunSources;
import com.crowdin.cli.commands.functionality.ProjectProxy;
import com.crowdin.cli.commands.parts.Command;
import com.crowdin.cli.commands.parts.PropertiesBuilderCommandPart;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.common.Settings;
import picocli.CommandLine;

import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@CommandLine.Command(
    name = "sources")
public class ListSourcesSubcommand extends Command {

    @CommandLine.Option(names = {"-b", "--branch"})
    protected String branch;

    @CommandLine.Option(names = {"--tree"})
    protected boolean treeView;

    @CommandLine.Mixin
    private PropertiesBuilderCommandPart propertiesBuilderCommandPart;

    @Override
    public void run() {
        PropertiesBean pb = propertiesBuilderCommandPart.buildPropertiesBean();
        Settings settings = Settings.withBaseUrl(pb.getApiToken(), pb.getBaseUrl());

        ProjectProxy project = new ProjectProxy(pb.getProjectId(), settings);
        try {
            ConsoleSpinner.start(RESOURCE_BUNDLE.getString("message.spinner.fetching_project_info"), this.noProgress);
            project.downloadProject()
                .downloadSupportedLanguages();
            ConsoleSpinner.stop(OK);
        } catch (Exception e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.collect_project_info"), e);
        }
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(), pb.getBasePath());

        (new DryrunSources(pb, placeholderUtil)).run(treeView);
    }
}
