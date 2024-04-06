package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.FileInfo;
import lombok.AllArgsConstructor;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.Objects;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;
import static java.util.Objects.nonNull;

@AllArgsConstructor
class FileDownloadAction implements NewAction<ProjectProperties, ProjectClient> {

    private final String file;
    private final String branch;
    private final String dest;

    @Override
    public void act(Outputter out, ProjectProperties properties, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner
            .execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                false, false, () -> client.downloadFullProject(branch));
        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);
        if (isStringsBasedProject) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.no_file_string_project")));
            return;
        }
        if (!project.isManagerAccess()) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.no_manager_access")));
            return;
        }

        String branchPrefix = nonNull(branch) ? branch + Utils.PATH_SEPARATOR : "";
        String filePath = Utils.toUnixPath(Utils.sepAtStart(branchPrefix + file));
        FileInfo foundFile = project.getFileInfos().stream()
            .filter(f -> Objects.equals(filePath, f.getPath()))
            .findFirst()
            .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.file_not_found"), filePath)));
        ConsoleSpinner.execute(
            out,
            "message.spinner.downloading_file",
            "error.downloading_file",
            false,
            false,
            () -> {
                URL url = client.downloadFile(foundFile.getId());
                String destPath = nonNull(dest) ? Utils.sepAtEnd(dest) + foundFile.getName() : file;
                saveToFile(Utils.normalizePath(Utils.joinPaths(properties.getBasePath(), destPath)), url);
                return url;
            }
        );
        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.downloaded_file"), filePath)));
    }

    private void saveToFile(String destPath, URL url) {
        FilesInterface files = new FsFiles();
        try (InputStream data = url.openStream()) {
            files.writeToFile(destPath, data);
        } catch (IOException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.write_file"), destPath), e);
        }
    }
}
