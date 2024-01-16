package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.FileInfo;
import lombok.AllArgsConstructor;

import java.util.List;
import java.util.Objects;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.SKIPPED;

@AllArgsConstructor
class FileDeleteAction implements NewAction<ProjectProperties, ProjectClient> {

    private final String file;

    @Override
    public void act(Outputter out, ProjectProperties properties, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner
            .execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                true, true, client::downloadFullProject);
        if (Objects.equals(project.getType(), Type.STRINGS_BASED)) {
            out.println(SKIPPED.withIcon(RESOURCE_BUNDLE.getString("message.no_file_string_project")));
            return;
        }
        String filePath = Utils.toUnixPath(Utils.sepAtStart(file));
        List<FileInfo> projectFiles = project.getFileInfos();
        FileInfo foundFile = projectFiles.stream()
            .filter(f -> Objects.equals(filePath, f.getPath()))
            .findFirst()
            .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.file_not_found"), filePath)));
        client.deleteSource(foundFile.getId());
        out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.file_deleted"), filePath)));
    }
}
