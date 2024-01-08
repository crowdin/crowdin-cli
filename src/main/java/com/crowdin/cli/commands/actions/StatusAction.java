package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.translationstatus.model.LanguageProgress;

import java.util.List;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

class StatusAction implements NewAction<ProjectProperties, ProjectClient> {

    private boolean noProgress;
    private String branchName;
    private String languageId;
    private String file;
    private String directory;
    private boolean isVerbose;
    private boolean showTranslated;
    private boolean showApproved;
    private boolean failIfIncomplete;

    public StatusAction(boolean noProgress, String branchName, String languageId, String file, String directory, boolean isVerbose, boolean showTranslated, boolean showApproved, boolean failIfIncomplete) {
        this.noProgress = noProgress;
        this.branchName = branchName;
        this.languageId = languageId;
        this.file = file;
        this.directory = directory;
        this.isVerbose = isVerbose;
        this.showTranslated = showTranslated;
        this.showApproved = showApproved;
        this.failIfIncomplete = failIfIncomplete;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, false, () -> client.downloadFullProject(branchName));

        if (languageId != null) {
            project.findLanguageById(languageId, true)
                .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.language_not_exist"), languageId)));
        }
        List<Branch> branches = client.listBranches();
        Long branchId = (branchName == null) ? null : branches.stream()
            .filter(branch -> branchName.equals(branch.getName()))
            .findFirst()
            .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.not_found_branch")))
            .getId();

        List<LanguageProgress> progresses;

        if (file != null) {
            String filePath = Utils.toUnixPath(Utils.sepAtStart(file));
            Long fileId = project.getFileInfos().stream()
                .filter(f -> filePath.equals(f.getPath()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), file)))
                .getId();
            progresses = client.getFileProgress(fileId);
        } else if (directory != null) {
            String directoryPath = Utils.toUnixPath(Utils.sepAtStart(directory));
            Long directoryId = project.getDirectories().values().stream()
                .filter(d -> directoryPath.equals(d.getPath()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.dir_not_exists"), directory)))
                .getId();
            progresses = client.getDirectoryProgress(directoryId);
        } else if (branchId != null) {
            progresses = client.getBranchProgress(branchId);
        } else {
            progresses = client.getProjectProgress(languageId);
        }
        if (languageId != null) {
            progresses = progresses.stream()
                    .filter(langProgress -> languageId.equals(langProgress.getLanguageId()))
                    .collect(Collectors.toList());
        }

        if (isVerbose) {
            progresses.forEach(pr -> {
                out.println(String.format(RESOURCE_BUNDLE.getString("message.language"),
                    project.findLanguageById(pr.getLanguageId(), true).get().getName(), pr.getLanguageId()));
                if (showTranslated) {
                    out.println(String.format(RESOURCE_BUNDLE.getString("message.translation_progress"),
                        pr.getTranslationProgress(),
                        pr.getWords().getTranslated(), pr.getWords().getTotal(),
                        pr.getPhrases().getTranslated(), pr.getPhrases().getTotal()));
                }
                if (showApproved) {
                    out.println(String.format(RESOURCE_BUNDLE.getString("message.approval_progress"),
                        pr.getApprovalProgress(),
                        pr.getWords().getApproved(), pr.getWords().getTotal(),
                        pr.getPhrases().getApproved(), pr.getPhrases().getTotal()));
                }
            });
        } else {
            if (showTranslated && showApproved) {
                out.println(RESOURCE_BUNDLE.getString("message.translation"));
            }
            if (showTranslated) {
                progresses.forEach(pr -> out.println(String.format(RESOURCE_BUNDLE.getString("message.item_list_with_percents"),
                    pr.getLanguageId(), pr.getTranslationProgress())));
            }
            if (showTranslated && showApproved) {
                out.println(RESOURCE_BUNDLE.getString("message.approval"));
            }
            if (showApproved) {
                progresses.forEach(pr -> out.println(String.format(RESOURCE_BUNDLE.getString("message.item_list_with_percents"),
                    pr.getLanguageId(), pr.getApprovalProgress())));
            }
            throwExceptionIfIncomplete(progresses.stream());
        }
    }

    private Consumer<? super LanguageProgress> throwException(String msg) {
        throw new RuntimeException(msg);
    }

    private void throwExceptionIfIncomplete(Stream<LanguageProgress> failedLanguageProjects) {
        List<LanguageProgress> collect = failedLanguageProjects.collect(Collectors.toList());

        if (showApproved && failIfIncomplete) {
            for (LanguageProgress p : collect) {
                if (p.getApprovalProgress() < 100) {
                    throwException(RESOURCE_BUNDLE.getString("error.project_is_incomplete"));
                }
            }
        } else if (showTranslated && failIfIncomplete) {
            for (LanguageProgress p : collect) {
                if (p.getTranslationProgress() < 100) {
                    throwException(RESOURCE_BUNDLE.getString("error.project_is_incomplete"));
                }
            }
        }
    }
}
