package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.tree.DrawTree;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.File;
import com.crowdin.client.sourcefiles.model.FileInfo;

import java.util.*;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

class FileListAction implements NewAction<ProjectProperties, ProjectClient> {

    private final boolean noProgress;
    private final String branchName;
    private final boolean treeView;
    private final boolean plainView;
    private final boolean isVerbose;

    public FileListAction(boolean noProgress, String branchName, boolean treeView, boolean plainView, boolean isVerbose) {
        this.noProgress = noProgress || plainView;
        this.branchName = branchName;
        this.treeView = treeView;
        this.plainView = plainView;
        this.isVerbose = isVerbose;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner
                .execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                        this.noProgress, this.plainView, () -> client.downloadFullProject(this.branchName));

        Long branchId = Optional.ofNullable(project.getBranch()).map(Branch::getId).orElse(null);

        List<Map.Entry<String, FileInfo>> list = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFileInfos())
                .entrySet()
                .stream()
                .filter(entry -> Objects.equals(entry.getValue().getBranchId(), branchId))
                .map(e -> new AbstractMap.SimpleEntry<>(e.getKey().replaceAll("^[/\\\\]+", ""), e.getValue()))
                .collect(Collectors.toList());

        if (treeView) {
            List<String> tree = list.stream().map(Map.Entry::getKey).collect(Collectors.toList());
            DrawTree.draw(tree).forEach(out::println);
            return;
        }

        for (Map.Entry<String, FileInfo> entry : list) {
            if (plainView) {
                if (isVerbose) {
                    if (entry.getValue() instanceof File) {
                        File file = (File) entry.getValue();
                        String str = entry.getValue().getId() +
                                " " +
                                entry.getKey() +
                                " " +
                                file.getType() +
                                " " +
                                file.getParserVersion() +
                                " " +
                                file.getRevisionId();
                        out.println(str);
                    } else {
                        out.println(entry.getValue().getId() + " " + entry.getKey() + " " + entry.getValue().getType());
                    }
                } else {
                    out.println(entry.getValue().getId() + " " + entry.getKey());
                }
            } else {
                if (isVerbose) {
                    if (entry.getValue() instanceof File) {
                        File file = (File) entry.getValue();
                        out.println(String.format(RESOURCE_BUNDLE.getString("message.file.list_verbose_full"), entry.getValue().getId(), entry.getKey(), entry.getValue().getType(), file.getParserVersion(), file.getRevisionId()));
                    } else {
                        out.println(String.format(RESOURCE_BUNDLE.getString("message.file.list_verbose"), entry.getValue().getId(), entry.getKey(), entry.getValue().getType()));
                    }
                } else {
                    out.println(String.format(RESOURCE_BUNDLE.getString("message.file.list"), entry.getValue().getId(), entry.getKey()));
                }
            }
        }
    }
}
