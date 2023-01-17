package com.crowdin.cli.commands.actions;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.CrowdinProjectInfo;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.commands.functionality.SourcesUtils;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.translations.model.ApplyPreTranslationRequest;
import com.crowdin.client.translations.model.AutoApproveOption;
import com.crowdin.client.translations.model.Method;
import com.crowdin.client.translations.model.PreTranslationStatus;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

class PreTranslateAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private List<String> languageIds;
    private Method method;
    private Long engineId;
    private String branchName;
    private AutoApproveOption autoApproveOption;
    private Boolean duplicateTranslations;
    private Boolean translateUntranslatedOnly;
    private Boolean translateWithPerfectMatchOnly;
    private boolean noProgress;
    private boolean debug;
    private boolean verbose;
    private boolean plainView;

    public PreTranslateAction(
        List<String> languageIds, Method method, Long engineId, String branchName, AutoApproveOption autoApproveOption, Boolean duplicateTranslations,
        Boolean translateUntranslatedOnly, Boolean translateWithPerfectMatchOnly, boolean noProgress, boolean debug, boolean verbose, boolean plainView
    ) {
        this.languageIds = languageIds;
        this.method = method;
        this.engineId = engineId;
        this.branchName = branchName;
        this.autoApproveOption = autoApproveOption;
        this.duplicateTranslations = duplicateTranslations;
        this.translateUntranslatedOnly = translateUntranslatedOnly;
        this.translateWithPerfectMatchOnly = translateWithPerfectMatchOnly;
        this.noProgress = noProgress;
        this.debug = debug;
        this.verbose = verbose;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, PropertiesWithFiles properties, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, this.plainView, () -> client.downloadFullProject(this.branchName));

        List<String> languages = this.prepareLanguageIds(project);
        List<Long> fileIds = this.prepareFileIds(out, properties, project);

        if (fileIds == null || fileIds.isEmpty()) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.no_files_found_for_pre_translate")));
        }

        ApplyPreTranslationRequest request = RequestBuilder.applyPreTranslation(
            languages, fileIds, method, engineId, autoApproveOption,
            duplicateTranslations, translateUntranslatedOnly, translateWithPerfectMatchOnly);

        this.applyPreTranslation(out, client, request);
    }

    private List<String> prepareLanguageIds(CrowdinProjectInfo projectInfo) {
        List<String> projectLanguages = projectInfo.getProjectLanguages(false).stream()
            .map(Language::getId)
            .collect(Collectors.toList());
        if (languageIds.size() == 1 && BaseCli.ALL.equals(languageIds.get(0))) {
            return projectLanguages;
        } else {
            String wrongLanguageIds = languageIds.stream()
                .filter(langId -> !projectLanguages.contains(langId))
                .map(id -> "'" + id + "'")
                .collect(Collectors.joining(", "));
            if (!wrongLanguageIds.isEmpty()) {
                throw new RuntimeException(
                    String.format(RESOURCE_BUNDLE.getString("error.languages_not_exist"), wrongLanguageIds));
            }
            return languageIds;
        }
    }

    private List<Long> prepareFileIds(Outputter out, PropertiesWithFiles pb, CrowdinProjectFull project) {
        Map<String, FileInfo> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFileInfos());
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(false), pb.getBasePath());
        List<String> sourcePaths = pb.getFiles().stream()
            .flatMap(file -> {
                List<String> sources = SourcesUtils.getFiles(pb.getBasePath(), file.getSource(), file.getIgnore(), placeholderUtil)
                    .map(File::getAbsolutePath)
                    .collect(Collectors.toList());
                String commonPath = (pb.getPreserveHierarchy()) ? "" : SourcesUtils.getCommonPath(sources, pb.getBasePath());
                return sources.stream()
                    .map(source -> (file.getDest() != null)
                        ? PropertiesBeanUtils.prepareDest(file.getDest(), StringUtils.removeStart(source, pb.getBasePath()), placeholderUtil) : StringUtils.removeStart(source, pb.getBasePath() + commonPath))
                    .map(source -> (branchName != null ? branchName + Utils.PATH_SEPARATOR : "") + source);
            })
            .distinct()
            .collect(Collectors.toList());
        List<String> onlyLocalSources = new ArrayList<>();
        List<String> foundSources = new ArrayList<>();
        for (String sourcePath : sourcePaths) {
            if (paths.containsKey(sourcePath)) {
                foundSources.add(sourcePath);
            } else {
                onlyLocalSources.add(sourcePath);
            }
        }
        if (!onlyLocalSources.isEmpty()) {
            if (verbose) {
                out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("message.pre_translate.local_files_message_verbose"), sourcePaths.size(), onlyLocalSources.size())));
                onlyLocalSources.forEach(source -> out.println(String.format(RESOURCE_BUNDLE.getString("message.item_list"), source)));
            } else {
                out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("message.pre_translate.local_files_message"), sourcePaths.size(), onlyLocalSources.size())));
            }
        }
        return foundSources.stream()
            .map(paths::get)
            .map(FileInfo::getId)
            .collect(Collectors.toList());
    }

    private void applyPreTranslation(Outputter out, ProjectClient client, ApplyPreTranslationRequest request) {
        ConsoleSpinner.execute(
            out,
            "message.spinner.pre_translate",
            "error.spinner.pre_translate",
            this.noProgress,
            this.plainView,
            () -> {
                PreTranslationStatus preTranslationStatus = client.startPreTranslation(request);

                while (!preTranslationStatus.getStatus().equalsIgnoreCase("finished")) {
                    ConsoleSpinner.update(
                            String.format(RESOURCE_BUNDLE.getString("message.spinner.pre_translate_percents"),
                                    Math.toIntExact(preTranslationStatus.getProgress())));
                    Thread.sleep(1000);

                    preTranslationStatus = client.checkPreTranslation(preTranslationStatus.getIdentifier());

                    if (preTranslationStatus.getStatus().equalsIgnoreCase("failed")) {
                        throw new RuntimeException();
                    }
                }

                ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.spinner.pre_translate_done"), 100));

                return preTranslationStatus;
            }
        );
    }
}
