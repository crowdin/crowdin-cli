package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.sourcefiles.model.Branch;

import java.util.Optional;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.SKIPPED;

public interface BranchLogic<T> {

    Optional<Branch> acquireBranch(T project);

    static <T> BranchLogic<T> noBranch() {
        return project -> Optional.empty();
    }

    static BranchLogic<CrowdinProjectFull> createIfAbsent(String branchName, ProjectClient client, Outputter out, boolean plainView) {
        return project -> {
            Optional<Branch> branchOpt = project.findBranchByName(branchName);
            if (branchOpt.isPresent()) {
                if (!plainView) {
                    out.println(SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch_already_exists"), branchName)));
                }
                return branchOpt;
            } else {
                Branch createdBranch = client.addBranch(RequestBuilder.addBranch(branchName, null, null, null));
                if (!plainView) {
                    out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch"), branchName)));
                }
                project.setCurrentBranch(createdBranch);
                return Optional.of(createdBranch);
            }
        };
    }

    static BranchLogic<CrowdinProjectFull> throwIfAbsent(String branchName) {
        return project -> {
            Optional<Branch> branchOpt = project.findBranchByName(branchName);
            branchOpt.ifPresent(project::setCurrentBranch);
            if (branchOpt.isPresent()) {
                return branchOpt;
            } else {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.not_found_branch"));
            }
        };
    }

    static BranchLogic<ProjectClient> throwIfAbsentWithoutFullProject(String branchName) {
        return client -> Optional.of(client.listBranches().stream()
            .filter(branch -> branchName.equals(branch.getName()))
            .findFirst()
            .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.not_found_branch"))));
    }
}
