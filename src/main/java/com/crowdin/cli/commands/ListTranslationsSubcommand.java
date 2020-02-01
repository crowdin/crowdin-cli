package com.crowdin.cli.commands;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ProjectWrapper;
import com.crowdin.cli.commands.parts.PropertiesBuilderCommandPart;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.CommandUtils;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.tree.DrawTree;
import com.crowdin.common.Settings;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import static com.crowdin.cli.utils.MessageSource.Messages.FETCHING_PROJECT_INFO;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@CommandLine.Command(name = "translations", description = "Lists information about the translated files in current project that match the wild-card pattern")
public class ListTranslationsSubcommand extends PropertiesBuilderCommandPart {

    @CommandLine.Option(names = {"--tree"}, description = "List contents of directories in a tree-like format")
    protected boolean treeView;

    @Override
    public Integer call() throws Exception {
        CommandUtils commandUtils = new CommandUtils();

        PropertiesBean pb = this.buildPropertiesBean();
        Settings settings = Settings.withBaseUrl(pb.getApiToken(), pb.getBaseUrl());

        ProjectWrapper project = getProjectInfo(pb.getProjectId(), settings);
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(), pb.getBasePath());

        List<File> files = pb
            .getFiles()
            .stream()
            .flatMap(file -> commandUtils.getSourcesWithoutIgnores(file, pb.getBasePath(), placeholderUtil).stream())
            .map(source -> StringUtils.removeStart(source, pb.getBasePath()))
            .map(File::new)
            .collect(Collectors.toList());


        List<String> translations = new ArrayList<>();
        for (FileBean fileBean : pb.getFiles()) {
            translations.addAll(placeholderUtil.format(files, fileBean.getTranslation(), true));
        }

        Collections.sort(translations);
        if (treeView) {
            (new DrawTree()).draw(translations, -1);
        } else {
            translations.forEach(System.out::println);
        }

        return 0;
    }

    private ProjectWrapper getProjectInfo(String projectId, Settings settings) {
        ConsoleSpinner.start(FETCHING_PROJECT_INFO.getString(), this.noProgress);
        ProjectWrapper projectInfo = new ProjectClient(settings).getProjectInfo(projectId, false);
        ConsoleSpinner.stop(OK);
        return projectInfo;
    }
}
