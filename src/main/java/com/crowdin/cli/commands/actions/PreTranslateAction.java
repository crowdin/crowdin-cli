package com.crowdin.cli.commands.actions;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.CrowdinProjectInfo;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.translations.model.*;
import lombok.AllArgsConstructor;

import java.util.*;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

@AllArgsConstructor
class PreTranslateAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private final List<String> languageIds;
    private final List<String> files;
    private final Method method;
    private final Long engineId;
    private final String branchName;
    private final AutoApproveOption autoApproveOption;
    private final Boolean duplicateTranslations;
    private final Boolean translateUntranslatedOnly;
    private final Boolean translateWithPerfectMatchOnly;
    private final boolean noProgress;
    private final boolean plainView;
    private final List<String> labelNames;

    @Override
    public void act(Outputter out, PropertiesWithFiles properties, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, this.plainView, () -> client.downloadFullProject(this.branchName));
        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);

        List<String> languages = this.prepareLanguageIds(project);
        List<Long> labelIds = this.prepareLabelIds(out, client);

        if (isStringsBasedProject) {
            if (files != null && !files.isEmpty()) {
                throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("message.no_file_string_project"));
            }
            Branch branch = project.findBranchByName(branchName)
                    .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.branch_required_string_project")));
            ApplyPreTranslationStringsBasedRequest request = RequestBuilder.applyPreTranslationStringsBased(
                    languages, Collections.singletonList(branch.getId()), method, engineId, autoApproveOption,
                    duplicateTranslations, translateUntranslatedOnly, translateWithPerfectMatchOnly, labelIds);
            this.applyPreTranslationStringsBased(out, client, request);
            return;
        }

        if (files == null || files.isEmpty()) {
            throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.file_required"));
        }

        Optional<Branch> branch = Optional.ofNullable(branchName).flatMap(project::findBranchByName);

        if (!branch.isPresent() && branchName != null) {
            throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("message.branch_does_not_exist"), branchName));
        }

        List<FileInfo> fileInfos = project
                .getFileInfos()
                .stream().filter(f -> !branch.isPresent() || branch.get().getId().equals(f.getBranchId()))
                .collect(Collectors.toList());
        Map<String, FileInfo> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), fileInfos);
        boolean containsError = false;

        List<Long> fileIds = new ArrayList<>();

        for (String file : files) {
            if (!paths.containsKey(file)) {
                if (files.size() > 1) {
                    containsError = true;
                    if (!plainView) {
                        out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), file)));
                    } else {
                        out.println(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), file));
                    }
                    continue;
                } else {
                    throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), file));
                }
            }
            Long fileId = paths.get(file).getId();
            fileIds.add(fileId);
        }

        if (fileIds.isEmpty()) {
            throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("error.no_files_found_for_pre_translate")));
        }

        ApplyPreTranslationRequest request = RequestBuilder.applyPreTranslation(
                languages, fileIds, method, engineId, autoApproveOption,
                duplicateTranslations, translateUntranslatedOnly, translateWithPerfectMatchOnly, labelIds);
        this.applyPreTranslation(out, client, request);

        if (containsError) {
            throw new RuntimeException();
        }
    }

    private List<String> prepareLanguageIds(CrowdinProjectInfo projectInfo) {
        List<String> projectLanguages = projectInfo.getProjectLanguages(false).stream()
                .map(Language::getId)
                .collect(Collectors.toList());
        if (languageIds.size() == 1 && BaseCli.ALL.equalsIgnoreCase(languageIds.get(0))) {
            return projectLanguages;
        } else {
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
    }

    private List<Long> prepareLabelIds(Outputter out, ProjectClient client) {
        if (labelNames != null && !labelNames.isEmpty()) {
            Map<String, Long> labels = client.listLabels().stream()
                    .collect(Collectors.toMap(Label::getTitle, Label::getId));
            labelNames.stream()
                    .distinct()
                    .forEach(labelName -> {
                                if (!labels.containsKey(labelName)) {
                                    if (!plainView) {
                                        out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("message.pre_translate.missing_label"), labelName)));
                                    } else {
                                        out.println(String.format(RESOURCE_BUNDLE.getString("message.pre_translate.missing_label"), labelName));
                                    }
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

    private void applyPreTranslation(Outputter out, ProjectClient client, ApplyPreTranslationRequest request) {
        ConsoleSpinner.execute(
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

    private void applyPreTranslationStringsBased(Outputter out, ProjectClient client, ApplyPreTranslationStringsBasedRequest request) {
        ConsoleSpinner.execute(
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
}
