package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.MaxNumberOfRetriesException;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.translations.model.BuildProjectTranslationRequest;
import com.crowdin.client.translations.model.CrowdinTranslationCreateProjectBuildForm;
import com.crowdin.client.translations.model.ProjectBuild;
import lombok.AllArgsConstructor;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

@AllArgsConstructor
class FileDownloadAction implements NewAction<ProjectProperties, ProjectClient> {

    private final String file;
    private final List<String> languageIds;
    private final String dest;

    @Override
    public void act(Outputter out, ProjectProperties properties, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner
            .execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                true, true, client::downloadFullProject);

        if (Objects.nonNull(languageIds)) {
            List<Language> languages = filterLanguages(project);
            PlaceholderUtil placeholderUtil = new PlaceholderUtil(
                project.getSupportedLanguages(),
                project.getProjectLanguages(true),
                properties.getBasePath()
            );
//            BuildProjectTranslationRequest request = new CrowdinTranslationCreateProjectBuildForm();
            CrowdinTranslationCreateProjectBuildForm request = new CrowdinTranslationCreateProjectBuildForm();
            request.setTargetLanguageIds(languages.stream().map(Language::getId).collect(Collectors.toList()));
            ProjectBuild build;
            try {
                build = client.startBuildingTranslation(request);
            } catch (MaxNumberOfRetriesException e) {
                ConsoleSpinner.stop(WARNING, RESOURCE_BUNDLE.getString("message.warning.another_build_in_progress"));
            } catch (ResponseException e) {
                //todo
            }

            ConsoleSpinner.execute(out, "message.spinner.downloading_translation", "error.downloading_file", this.noProgress, this.plainView, () -> {
                URL url = client.downloadBuild(build.getId());
                try (InputStream data = url.openStream()) {
                    files.writeToFile(archivePath, data);
                } catch (IOException e) {
                    throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.write_file"), archivePath), e);
                }
            });


//            request
            RequestBuilder.crowdinTranslationCreateProjectPseudoBuildForm(true, null, null, null, null);
            FilesInterface filesInterface = new FsFiles();
//            ProjectBuild projectBuild = buildTranslation(client, request);
        }


        String filePath = Utils.unixPath(file);
        FileInfo foundFile = project.getFileInfos().stream()
            .filter(f -> Objects.equals(filePath, f.getPath()))
            .findFirst()
            .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.file_not_found"), filePath)));
        URL url = client.downloadFile(foundFile.getId());
        String destPath = Objects.nonNull(dest) ? Utils.normalizePath(dest) + foundFile.getName() : filePath;
        FilesInterface files = new FsFiles();
        try (InputStream data = url.openStream()) {
            files.writeToFile(destPath, data);
        } catch (IOException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.write_file"), filePath), e);
        }
        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.downloaded_file"), filePath)));
    }

    private List<Language> filterLanguages(CrowdinProjectFull project) {
        return languageIds.stream()
            .map(lang -> project.findLanguageById(lang, true)
                .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.language_not_exist"), lang))))
            .collect(Collectors.toList());
    }

    private void downloadTranslations(FilesInterface filesInterface, ProjectClient client, Long buildId, String archivePath, Outputter out) {
        ConsoleSpinner.execute(out, "message.spinner.downloading_translation", "error.downloading_file", true, true, () -> {
            URL url = client.downloadBuild(buildId);
            try (InputStream data = url.openStream()) {
                filesInterface.writeToFile(archivePath, data);
            } catch (IOException e) {
                throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.write_file"), archivePath), e);
            }
            return url;
        });
    }
}
