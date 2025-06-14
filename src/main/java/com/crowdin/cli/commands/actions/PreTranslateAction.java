package com.crowdin.cli.commands.actions;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.CrowdinProjectInfo;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.machinetranslationengines.model.MachineTranslation;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.translations.model.*;
import lombok.AllArgsConstructor;
import org.apache.commons.lang3.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

@AllArgsConstructor
class PreTranslateAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private final List<String> languageIds;
    private final List<String> files;
    private final Method method;
    private final Long engineId;
    private final String branchName;
    private final String directory;
    private final AutoApproveOption autoApproveOption;
    private final Boolean duplicateTranslations;
    private final Boolean translateUntranslatedOnly;
    private final Boolean translateWithPerfectMatchOnly;
    private final boolean noProgress;
    private final boolean plainView;
    private final List<String> labelNames;
    private final Long aiPrompt;
    private final boolean isVerbose;

    @Override
    public void act(Outputter out, PropertiesWithFiles properties, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, this.plainView, () -> client.downloadFullProject(this.branchName));
        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);

        List<String> languages = this.prepareLanguageIds(project, client, out);
        List<Long> labelIds = this.prepareLabelIds(out, client);

        if (isStringsBasedProject) {
            if ((files != null && !files.isEmpty()) || directory != null) {
                throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("message.no_file_string_project"));
            }
            Branch branch = project.findBranchByName(branchName)
                    .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.branch_required_string_project")));
            ApplyPreTranslationStringsBasedRequest request = RequestBuilder.applyPreTranslationStringsBased(
                    languages, Collections.singletonList(branch.getId()), method, engineId, autoApproveOption,
                    duplicateTranslations, translateUntranslatedOnly, translateWithPerfectMatchOnly, labelIds, aiPrompt);
            PreTranslationStatus status = this.applyPreTranslationStringsBased(out, client, request);
            this.printVerbose(client, status, out);
            return;
        }

        Optional<Branch> branch = Optional.ofNullable(branchName).flatMap(project::findBranchByName);

        if (!branch.isPresent() && branchName != null) {
            throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("message.branch_does_not_exist"), branchName));
        }

        List<FileInfo> fileInfos = project
                .getFileInfos()
                .stream()
                .filter(f -> (branch.isEmpty() && f.getBranchId() == null)
                        || (branch.isPresent() && branch.get().getId().equals(f.getBranchId())))
                .collect(Collectors.toList());
        Map<String, FileInfo> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), fileInfos);
        boolean containsError = false;

        List<Long> fileIds = new ArrayList<>();

        if ((files != null && !files.isEmpty())) {
            for (String file : files) {
                if (!paths.containsKey(file)) {
                    if (files.size() > 1) {
                        containsError = true;
                        out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), file)));
                        continue;
                    } else {
                        throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), file));
                    }
                }
                Long fileId = paths.get(file).getId();
                fileIds.add(fileId);
            }
        } else if (!StringUtils.isEmpty(directory)) {
            for (Map.Entry<String, FileInfo> entry : paths.entrySet()) {
                if (entry.getKey().startsWith(directory)) {
                    fileIds.add(entry.getValue().getId());
                }
            }
        } else {
            fileIds = paths.values().stream().map(FileInfo::getId).toList();
        }

        if (fileIds.isEmpty()) {
            throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("error.no_files_found_for_pre_translate")));
        }

        ApplyPreTranslationRequest request = RequestBuilder.applyPreTranslation(
                languages, fileIds, method, engineId, autoApproveOption,
                duplicateTranslations, translateUntranslatedOnly, translateWithPerfectMatchOnly, labelIds, aiPrompt);
        PreTranslationStatus status = this.applyPreTranslation(out, client, request);
        this.printVerbose(client, status, out);

        if (containsError) {
            throw new RuntimeException();
        }
    }

    private List<String> prepareLanguageIds(CrowdinProjectInfo projectInfo, ProjectClient client, Outputter out) {
        List<String> projectLanguages = projectInfo.getProjectLanguages(false).stream()
                .map(Language::getId)
                .collect(Collectors.toList());
        if (languageIds == null || (languageIds.size() == 1 && BaseCli.ALL.equalsIgnoreCase(languageIds.get(0)))) {
            if (Method.MT.equals(method)) {
                try {
                    ConsoleSpinner.start(out, RESOURCE_BUNDLE.getString("message.spinner.validating_mt_languages"), this.noProgress);
                    MachineTranslation mt = client.getMt(engineId);
                    ConsoleSpinner.stop(OK, RESOURCE_BUNDLE.getString("message.spinner.validation_success"));
                    Set<String> supportedMtLanguageIds = new HashSet<>(mt.getSupportedLanguageIds());
                    return projectLanguages.stream()
                            .filter(supportedMtLanguageIds::contains)
                            .collect(Collectors.toList());
                } catch (ResponseException e) {
                    ConsoleSpinner.stop(WARNING, String.format(RESOURCE_BUNDLE.getString("message.spinner.validation_error"), e.getMessage()));
                }
            }
            return projectLanguages;
        }
        String wrongLanguageIds = languageIds.stream()
                .filter(langId -> !projectLanguages.contains(langId))
                .map(id -> "'" + id + "'")
                .collect(Collectors.joining(", "));
        if (!wrongLanguageIds.isEmpty()) {
            throw new ExitCodeExceptionMapper.NotFoundException(
                    String.format(RESOURCE_BUNDLE.getString("error.languages_not_exist"), wrongLanguageIds));
        }
        return languageIds;
    }

    private List<Long> prepareLabelIds(Outputter out, ProjectClient client) {
        if (labelNames != null && !labelNames.isEmpty()) {
            Map<String, Long> labels = client.listLabels().stream()
                    .collect(Collectors.toMap(Label::getTitle, Label::getId));
            labelNames.stream()
                    .distinct()
                    .forEach(labelName -> {
                                if (!labels.containsKey(labelName)) {
                                    out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("message.pre_translate.missing_label"), labelName)));
                                }
                            }
                    );
            return labelNames.stream()
                    .map(labels::get)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } else {
            return null;
        }
    }

    private PreTranslationStatus applyPreTranslation(Outputter out, ProjectClient client, ApplyPreTranslationRequest request) {
        return ConsoleSpinner.execute(
                out,
                "message.spinner.pre_translate",
                "error.spinner.pre_translate",
                this.noProgress,
                this.plainView,
                () -> {
                    PreTranslationStatus preTranslationStatus = client.startPreTranslation(request);
                    preTranslationStatus = handlePreTranslationStatus(client, preTranslationStatus);

                    ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.spinner.pre_translate_done"), 100));

                    return preTranslationStatus;
                }
        );
    }

    private PreTranslationStatus applyPreTranslationStringsBased(Outputter out, ProjectClient client, ApplyPreTranslationStringsBasedRequest request) {
        return ConsoleSpinner.execute(
                out,
                "message.spinner.pre_translate",
                "error.spinner.pre_translate",
                this.noProgress,
                this.plainView,
                () -> {
                    PreTranslationStatus preTranslationStatus = client.startPreTranslationStringsBased(request);
                    preTranslationStatus = handlePreTranslationStatus(client, preTranslationStatus);

                    ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.spinner.pre_translate_done"), 100));

                    return preTranslationStatus;
                }
        );
    }

    private PreTranslationStatus handlePreTranslationStatus(ProjectClient client, PreTranslationStatus preTranslationStatus) throws InterruptedException {
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
        return preTranslationStatus;
    }

    private void printVerbose(ProjectClient client, PreTranslationStatus status, Outputter out) {
        if (!this.isVerbose) {
            return;
        }

        PreTranslationReportResponse preTranslationReport = client.getPreTranslationReport(status.getIdentifier());

        int filesCount = preTranslationReport.getLanguages().stream()
                .mapToInt(l -> Optional.ofNullable(l.getFiles()).map(List::size).orElse(0))
                .sum();

        int phrasesCount = preTranslationReport.getLanguages().stream()
                .flatMap(l -> Optional.ofNullable(l.getFiles()).orElse(List.of()).stream())
                .mapToInt(f -> Optional.ofNullable(f.getStatistics())
                        .map(PreTranslationReportResponse.Statistics::getPhrases)
                        .orElse(0)
                )
                .sum();

        int wordsCount = preTranslationReport.getLanguages().stream()
                .flatMap(l -> Optional.ofNullable(l.getFiles()).orElse(List.of()).stream())
                .mapToInt(f -> Optional.ofNullable(f.getStatistics())
                        .map(PreTranslationReportResponse.Statistics::getWords)
                        .orElse(0)
                )
                .sum();

        int skippedCount = preTranslationReport.getLanguages().stream()
                .flatMapToInt(l -> Optional.ofNullable(l.getSkipped()).map(Map::values).orElse(List.of()).stream().mapToInt(i -> i))
                .sum();

        out.println(String.format(RESOURCE_BUNDLE.getString("message.pre_translate.files_count"), filesCount));
        out.println(String.format(RESOURCE_BUNDLE.getString("message.pre_translate.phrases_count"), phrasesCount));
        out.println(String.format(RESOURCE_BUNDLE.getString("message.pre_translate.words_count"), wordsCount));
        out.println(String.format(RESOURCE_BUNDLE.getString("message.pre_translate.skipped_count"), skippedCount));
    }
}
