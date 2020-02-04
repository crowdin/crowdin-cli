package com.crowdin.cli.commands;

import com.crowdin.cli.client.BranchClient;
import com.crowdin.cli.client.DirectoriesClient;
import com.crowdin.cli.client.FileClient;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.commands.functionality.DryrunProjectFiles;
import com.crowdin.cli.commands.parts.PropertiesBuilderCommandPart;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.models.Directory;
import com.crowdin.common.models.FileEntity;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.util.*;

import static com.crowdin.cli.utils.MessageSource.Messages.FETCHING_PROJECT_INFO;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@CommandLine.Command(
    name = "project",
    customSynopsis = "@|fg(yellow) crowdin list project|@ [CONFIG OPTIONS] [OPTIONS]",
    description = "Show a list of files (in the current project)")
public class ListProjectSubcommand extends PropertiesBuilderCommandPart {

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", description = "Defines branch name (default: none)")
    protected String branch;

    @CommandLine.Option(names = {"--tree"}, description = "List contents of directories in a tree-like format")
    protected boolean treeView;

    @Override
    public void run() {
        PropertiesBean pb = this.buildPropertiesBean();
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
            files = fileClient.getProjectFiles(pb.getProjectId());
            directories = directoriesClient.getProjectDirectories();

            ConsoleSpinner.stop(OK);
        } catch (ResponseException e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException("Couldn't get files from server", e);
        } catch (Exception e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException("Unhandled exception", e);
        }

        (new DryrunProjectFiles(files, directories, branches, branchId)).run(treeView);
    }
}
