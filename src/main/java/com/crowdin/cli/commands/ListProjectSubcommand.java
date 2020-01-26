package com.crowdin.cli.commands;

import com.crowdin.cli.client.*;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.properties.CliProperties;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.CommandUtils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.file.FileReader;
import com.crowdin.cli.utils.tree.DrawTree;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.models.Directory;
import com.crowdin.common.models.FileEntity;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static com.crowdin.cli.utils.MessageSource.Messages.FETCHING_PROJECT_INFO;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@CommandLine.Command(name = "list project", description = "Show a list of files (in the current project)")
public class ListProjectSubcommand extends GeneralCommand {

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

        BranchClient branchClient = new BranchClient(settings);
        FileClient fileClient = new FileClient(settings);
        DirectoriesClient directoriesClient = new DirectoriesClient(settings, pb.getProjectId());

        Long branchId;
        List<FileEntity> files;
        List<Directory> directories;
        Map<Long, String> branches;
        try {
            ConsoleSpinner.start(FETCHING_PROJECT_INFO.getString(), this.noProgress);

            branchId = (StringUtils.isNotEmpty(this.branch))
                    ? branchClient.getProjectBranchByName(pb.getProjectId(), branch)
                    .map(Branch::getId)
                    .orElseThrow(() -> new RuntimeException("Couldn't find branchId by that name"))
                    : null;
            branches = branchClient.getBranchesMapIdName(pb.getProjectId());
            files = fileClient.getProjectFiles(new Long(pb.getProjectId()));
            directories = directoriesClient.getProjectDirectories();

            ConsoleSpinner.stop(OK);
        } catch (ResponseException e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException("Couldn't get files from server", e);
        } catch (Exception e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException("Unhandled exception", e);
        }

        List<String> filePaths = commandUtils.buildPaths(files, directories, branches, branchId);
        Collections.sort(filePaths);
        if (treeView) {
            (new DrawTree()).draw(filePaths, -1);
        } else {
            filePaths.forEach(System.out::println);
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
