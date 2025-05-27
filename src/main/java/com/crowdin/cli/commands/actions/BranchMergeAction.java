package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.BranchUtils;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.branches.model.BranchMergeStatus;
import com.crowdin.client.branches.model.BranchMergeSummary;
import com.crowdin.client.branches.model.MergeBranchRequest;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.Branch;
import lombok.AllArgsConstructor;

import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@AllArgsConstructor
class BranchMergeAction implements NewAction<ProjectProperties, ProjectClient> {

    private final String source;
    private final String target;
    private final boolean noProgress;
    private final boolean plainView;
    private final boolean dryrun;
    private final boolean deleteAfterMerge;

    @Override
    public void act(Outputter out, ProjectProperties properties, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, plainView, client::downloadFullProject);

        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);
        if (!isStringsBasedProject) {
            throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.string_based_only"));
        }

        String normalizedSource = BranchUtils.normalizeBranchName(source);
        Optional<Branch> sourceBranch = project.findBranchByName(normalizedSource);
        if (sourceBranch.isEmpty()) {
            throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("error.branch_not_exists"), source));
        }

        String normalizedTarget = BranchUtils.normalizeBranchName(target);
        Optional<Branch> targetBranch = project.findBranchByName(normalizedTarget);
        if (targetBranch.isEmpty()) {
            throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("error.branch_not_exists"), target));
        }

        MergeBranchRequest request = new MergeBranchRequest();
        request.setSourceBranchId(sourceBranch.get().getId());
        request.setDeleteAfterMerge(deleteAfterMerge);
        request.setDryRun(dryrun);
        BranchMergeSummary summary = mergeBranch(out, client, targetBranch.get().getId(), request);

        String summaryStr = summary.getDetails().entrySet().stream()
                .map(entry -> entry.getKey() + ": " + entry.getValue())
                .collect(Collectors.joining(", "));

        if (!plainView) {
            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch.merge"), source, target)));
            out.println(String.format(RESOURCE_BUNDLE.getString("message.branch.merge_details"), summaryStr));
        } else {
            out.println(String.valueOf(summary.getTargetBranchId()));
        }
    }

    private BranchMergeSummary mergeBranch(Outputter out, ProjectClient client, Long branchId, MergeBranchRequest request) {
        return ConsoleSpinner.execute(
                out,
                "message.spinner.merging_branch",
                "error.branch.merge",
                this.noProgress,
                false,
                () -> {
                    BranchMergeStatus status = client.mergeBranch(branchId, request);

                    while (!status.getStatus().equalsIgnoreCase("finished")) {
                        ConsoleSpinner.update(
                                String.format(RESOURCE_BUNDLE.getString("message.spinner.merging_branch_percents"), status.getProgress()));
                        Thread.sleep(1000);

                        status = client.checkMergeBranchStatus(branchId, status.getIdentifier());

                        if (status.getStatus().equalsIgnoreCase("failed")) {
                            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.branch.merge"));
                        }
                    }
                    ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.spinner.merging_branch_percents"), 100));
                    return client.getBranchMergeSummary(branchId, status.getIdentifier());
                }
        );
    }
}
