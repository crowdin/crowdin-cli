package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.EmptyFileException;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.BranchUtils;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.translations.model.UploadTranslationsRequest;
import com.crowdin.client.translations.model.UploadTranslationsStringsRequest;
import lombok.AllArgsConstructor;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.Objects;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@AllArgsConstructor
public class FileUploadTranslationAction implements NewAction<ProjectProperties, ProjectClient> {

    private final File file;
    private final String branchName;
    private final String dest;
    private final String languageId;
    private final boolean plainView;

    @Override
    public void act(Outputter out, ProjectProperties properties, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.plainView, this.plainView, () -> client.downloadFullProject(branchName));

        if (!project.findLanguageById(languageId, true).isPresent())
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.language_not_exist"), languageId));

        if (Objects.equals(Type.FILES_BASED, project.getType())) {
            if (Objects.isNull(dest))
                throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.file.dest_required"), languageId));
            String sourcePath = Utils.unixPath(Utils.sepAtStart(dest));
            FileInfo sourceFileInfo = project.getFileInfos().stream()
                .filter(fi -> Objects.equals(sourcePath, fi.getPath()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.file_not_found"), sourcePath)));

            UploadTranslationsRequest request = new UploadTranslationsRequest();
            Long storageId = getStorageId(client);
            request.setFileId(sourceFileInfo.getId());
            request.setStorageId(storageId);
            try {
                client.uploadTranslations(languageId, request);
            } catch (Exception e) {
                throw new RuntimeException(String.format(
                    RESOURCE_BUNDLE.getString("error.upload_translation"), file.getPath()), e);
            }
        } else if (Objects.equals(Type.STRINGS_BASED, project.getType())) {
            UploadTranslationsStringsRequest request = new UploadTranslationsStringsRequest();
            Branch branch = BranchUtils.getOrCreateBranch(out, branchName, client, project, plainView);
            if (Objects.isNull(branch))
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.branch_required_string_project"));
            Long storageId = getStorageId(client);
            request.setBranchId(branch.getId());
            request.setStorageId(storageId);
            client.uploadTranslationStringsBased(languageId, request);
        }

        if (!plainView) {
            out.println(OK.withIcon(String.format(
                RESOURCE_BUNDLE.getString("message.translation_uploaded"), file.getPath())));
        } else {
            out.println(file.getPath());
        }
    }

    private Long getStorageId(ProjectClient client) {
        try (InputStream fileStream = Files.newInputStream(file.toPath())) {
            return client.uploadStorage(file.getName(), fileStream);
        } catch (FileNotFoundException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.local_file_not_found"), file.getAbsolutePath()));
        } catch (EmptyFileException e){
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("message.uploading_file_skipped"), file.getAbsolutePath()));
        } catch (Exception e) {
            throw new RuntimeException(
                String.format(RESOURCE_BUNDLE.getString("error.upload_to_storage"), file.getAbsolutePath()), e);
        }
    }
}
