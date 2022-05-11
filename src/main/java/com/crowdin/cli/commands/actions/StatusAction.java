package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProject;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.BranchLogic;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.translationstatus.model.LanguageProgress;

import java.util.List;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

class StatusAction implements NewAction<ProjectProperties, ProjectClient> {

    private boolean noProgress;
    private String branchName;
    private String languageId;
    private boolean isVerbose;
    private boolean showTranslated;
    private boolean showApproved;

    public StatusAction(boolean noProgress, String branchName, String languageId, boolean isVerbose, boolean showTranslated, boolean showApproved) {
        this.noProgress = noProgress;
        this.branchName = branchName;
        this.languageId = languageId;
        this.isVerbose = isVerbose;
        this.showTranslated = showTranslated;
        this.showApproved = showApproved;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        BranchLogic<ProjectClient> branchLogic = (branchName != null)
            ? BranchLogic.throwIfAbsentWithoutFullProject(branchName)
            : BranchLogic.noBranch();
        CrowdinProject project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, false, client::downloadProjectWithLanguages);

        if (languageId != null) {
            project.findLanguageById(languageId, true)
                .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.not_found_language"), languageId)));
        }
        Long branchId = branchLogic.acquireBranch(client).map(Branch::getId).orElse(null);

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
        }
    }
}
