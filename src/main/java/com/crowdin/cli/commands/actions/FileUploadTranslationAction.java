package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.EmptyFileException;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.BranchUtils;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
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
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

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
        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);

        if (!project.isManagerAccess()) {
            if (!plainView) {
                out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.no_manager_access")));
                return;
            } else {
                throw new ExitCodeExceptionMapper.ForbiddenException(RESOURCE_BUNDLE.getString("message.no_manager_access"));
            }
        }

        if (!project.findLanguageById(languageId, true).isPresent()) {
            throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("error.language_not_exist"), languageId));
        }

        if (!isStringsBasedProject) {
            if (Objects.isNull(dest))
                throw new ExitCodeExceptionMapper.ValidationException(String.format(RESOURCE_BUNDLE.getString("error.file.dest_required"), languageId));
            String sourcePath = Utils.toUnixPath(Utils.sepAtStart(dest));
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
                throw ExitCodeExceptionMapper.remap(e, String.format(
                    RESOURCE_BUNDLE.getString("error.upload_translation"), file.getPath()));
            }
        } else {
            UploadTranslationsStringsRequest request = new UploadTranslationsStringsRequest();
            Branch branch = project.findBranchByName(branchName)
                .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.branch_required_string_project")));
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
            throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("error.local_file_not_found"), file.getAbsolutePath()));
        } catch (EmptyFileException e){
            throw new ExitCodeExceptionMapper.ValidationException(String.format(RESOURCE_BUNDLE.getString("message.uploading_file_skipped"), file.getAbsolutePath()));
        } catch (Exception e) {
            throw ExitCodeExceptionMapper.remap(e,
                String.format(RESOURCE_BUNDLE.getString("error.upload_to_storage"), file.getAbsolutePath()));
        }
    }
}
