package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProject;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
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
    private boolean isVerbose;
    private boolean showTranslated;
    private boolean showApproved;
    private boolean failIfIncomplete;

    public StatusAction(boolean noProgress, String branchName, String languageId, boolean isVerbose, boolean showTranslated, boolean showApproved, boolean failIfIncomplete) {
        this.noProgress = noProgress;
        this.branchName = branchName;
        this.languageId = languageId;
        this.isVerbose = isVerbose;
        this.showTranslated = showTranslated;
        this.showApproved = showApproved;
        this.failIfIncomplete = failIfIncomplete;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        CrowdinProject project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, false, client::downloadProjectWithLanguages);

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
        if (branchId == null) {
            progresses = client.getProjectProgress(languageId);
        } else {
            progresses = client.getBranchProgress(branchId);
            if (languageId != null) {
                progresses = progresses.stream()
                    .filter(langProgress -> languageId.equals(langProgress.getLanguageId()))
                    .collect(Collectors.toList());
            }
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
