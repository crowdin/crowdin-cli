package com.crowdin.cli.commands;

import com.crowdin.cli.client.BranchClient;
import com.crowdin.cli.client.DirectoriesClient;
import com.crowdin.cli.client.FileClient;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.commands.parts.PropertiesBuilderCommandPart;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.tree.DrawTree;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.models.Directory;
import com.crowdin.common.models.FileEntity;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.crowdin.cli.utils.MessageSource.Messages.FETCHING_PROJECT_INFO;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@CommandLine.Command(name = "project", description = "Show a list of files (in the current project)")
public class ListProjectSubcommand extends PropertiesBuilderCommandPart {

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", description = "Defines branch name (default: none)")
    protected String branch;

    @CommandLine.Option(names = {"--tree"}, description = "List contents of directories in a tree-like format")
    protected boolean treeView;

    @Override
    public Integer call() throws Exception {
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

        List<String> filePaths = buildPaths(files, directories, branches, branchId);
        Collections.sort(filePaths);
        if (treeView) {
            (new DrawTree()).draw(filePaths, -1);
        } else {
            filePaths.forEach(System.out::println);
        }
        return 0;
    }

    public List<String> buildPaths(List<FileEntity> files, List<Directory> directories, Map<Long, String> branches, Long branchId) {
        Map<Long, Directory> directoriesMap = directories.stream()
                .collect(Collectors.toMap(Directory::getId, Function.identity()));
        List<String> paths = new ArrayList<>();
        for (FileEntity file : files) {
            StringBuilder sb = new StringBuilder(Utils.PATH_SEPARATOR + file.getName());
            Long directoryId = file.getDirectoryId();
            if (directoryId == null && !Objects.equals(file.getBranchId(), branchId)) {
                continue;
            }
            Directory parent = null;
            while (directoryId != null) {
                parent = directoriesMap.get(directoryId);
                sb.insert(0, Utils.PATH_SEPARATOR + parent.getName());
                directoryId = parent.getDirectoryId();
            }
            if (parent != null && !Objects.equals(parent.getBranchId(), branchId)) {
                continue;
            }
            if (parent != null && parent.getBranchId() != null) {
                sb.insert(0, Utils.PATH_SEPARATOR + branches.get(parent.getBranchId()));
            } else if (file.getBranchId() != null) {
                sb.insert(0, Utils.PATH_SEPARATOR + branches.get(file.getBranchId()));
            }
            paths.add(sb.toString());
        }
        return paths;
    }
}
