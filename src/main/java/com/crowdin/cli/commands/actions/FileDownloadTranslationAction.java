package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.translations.model.BuildProjectFileTranslationRequest;
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
public class FileDownloadTranslationAction implements NewAction<ProjectProperties, ProjectClient> {

    private final String file;
    private final String languageId;
    private final String dest;

    @Override
    public void act(Outputter out, ProjectProperties properties, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner
            .execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                true, true, client::downloadFullProject);
        if (Objects.equals(project.getType(), Type.STRINGS_BASED)) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.no_file_string_project")));
            return;
        }
        if (!project.isManagerAccess()) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.no_manager_access")));
            return;
        }

        Language language = project.findLanguageById(languageId, true)
            .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.language_not_exist"), languageId)));
        String sourcePath = Utils.toUnixPath(Utils.sepAtStart(file));
        FileInfo sourceFileInfo = project.getFileInfos().stream()
            .filter(fi -> Objects.equals(sourcePath, fi.getPath()))
            .findFirst()
            .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.file_not_found"), sourcePath)));
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(
            project.getSupportedLanguages(),
            project.getProjectLanguages(true),
            properties.getBasePath()
        );
        BuildProjectFileTranslationRequest request = new BuildProjectFileTranslationRequest();
        request.setTargetLanguageId(language.getId());

        URL url = client.buildProjectFileTranslation(sourceFileInfo.getId(), request);
        String destPath = nonNull(dest)
            ? placeholderUtil.replaceLanguageDependentPlaceholders(dest + Utils.PATH_SEPARATOR + sourceFileInfo.getName(), language)
            : languageId + sourcePath;
        saveToFile(Utils.normalizePath(destPath), url);
        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.downloaded_file"), destPath)));
        out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.experimental_command")));
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
