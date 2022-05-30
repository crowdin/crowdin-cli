package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.sourcefiles.model.Branch;

import java.util.Optional;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.SKIPPED;

public interface BranchLogic<T> {

    Optional<Branch> acquireBranch(T project);

    default void printResults(Outputter out) {
        // do nothing
    }

    static <T> BranchLogic<T> noBranch() {
        return project -> Optional.empty();
    }

    static BranchLogic<CrowdinProjectFull> createIfAbsent(String branchName, ProjectClient client, boolean plainView) {
        return new BranchLogic<CrowdinProjectFull>() {

            private String status;

            @Override
            public Optional<Branch> acquireBranch(CrowdinProjectFull project) {
                Optional<Branch> branchOpt = project.findBranchByName(branchName);
                if (branchOpt.isPresent()) {
                    if (!plainView) {
                        status = SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch_already_exists"), branchName));
                    }
                } else {
                    branchOpt = Optional.of(client.addBranch(RequestBuilder.addBranch(branchName, null, null, null)));
                    if (!plainView) {
                        status = OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch"), branchName));
                    }
                }
                project.setCurrentBranch(branchOpt.get());
                return branchOpt;
            }

            @Override
            public void printResults(Outputter out) {
                if (status != null) {
                    out.println(status);
                }
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
