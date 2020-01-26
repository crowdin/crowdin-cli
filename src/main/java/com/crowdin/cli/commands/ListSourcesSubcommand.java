package com.crowdin.cli.commands;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ProjectWrapper;
import com.crowdin.cli.properties.CliProperties;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.CommandUtils;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.file.FileReader;
import com.crowdin.cli.utils.tree.DrawTree;
import com.crowdin.common.Settings;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.util.List;
import java.util.stream.Collectors;

import static com.crowdin.cli.utils.MessageSource.Messages.FETCHING_PROJECT_INFO;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@CommandLine.Command(name = "list sources", description = "Lists information about the sources files in current project that match the wild-card pattern")
public class ListSourcesSubcommand extends GeneralCommand {

    @CommandLine.Option(names = {"-b", "--branch"}, description = "Defines branch name (default: none)")
    protected String branch;

    @CommandLine.Option(names = {"--tree"}, description = "List contents of directories in a tree-like format")
    protected boolean treeView;

    @CommandLine.ArgGroup(exclusive = false, heading = "@|bold config params|@:%n")
    protected Params params;

    @Override
    public Integer call() throws Exception {
        CommandUtils commandUtils = new CommandUtils();
        CliProperties cliProperties = new CliProperties();

        PropertiesBean pb = (params != null)
                ? cliProperties.getFromParams(params)
                : cliProperties.loadProperties((new FileReader()).readCliConfig(configFilePath.toFile()));
        cliProperties.validateProperties(pb);
        pb.setBasePath(commandUtils.getBasePath(pb.getBasePath(), configFilePath.toFile(), false));
        Settings settings = Settings.withBaseUrl(pb.getApiToken(), pb.getBaseUrl());


        ProjectWrapper projectInfo = getProjectInfo(pb.getProjectId(), settings);

        PlaceholderUtil placeholderUtil = new PlaceholderUtil(projectInfo.getSupportedLanguages(), projectInfo.getProjectLanguages(), pb.getBasePath());

        List<String> files;
        try {
            files = pb
                    .getFiles()
                    .stream()
                    .flatMap(file -> commandUtils.getSourcesWithoutIgnores(file, pb.getBasePath(), placeholderUtil).stream())
                    .map(source -> StringUtils.removeStart(source, pb.getBasePath()))
                    .collect(Collectors.toList());

            final String commonPath =
                    (pb.getPreserveHierarchy()) ? "" : commandUtils.getCommonPath(files);

            files = files.stream()
                    .map(source -> StringUtils.removeStart(source, commonPath))
                    .collect(Collectors.toList());

            files.sort(String::compareTo);
        } catch (Exception e) {
            throw new RuntimeException("Couldn't prepare source files", e);
        }

        if (branch != null) {
            System.out.println(branch);
        }
        if (treeView) {
            (new DrawTree()).draw(files, 0);
        } else {
            files.forEach(System.out::println);
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
