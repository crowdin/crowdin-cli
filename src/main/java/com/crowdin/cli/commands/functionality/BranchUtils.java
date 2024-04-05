package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.sourcefiles.model.AddBranchRequest;
import com.crowdin.client.sourcefiles.model.Branch;
import org.apache.commons.lang3.StringUtils;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.SKIPPED;

public class BranchUtils {

    private static final Set<Character> BRANCH_UNALLOWED_SYMBOLS = new HashSet<>(
            Arrays.asList('/', '\\', ':', '*', '?', '"', '<', '>', '|')
    );

    public static Branch getOrCreateBranch(Outputter out, String branchName, ProjectClient client, CrowdinProjectFull project, boolean plainView) {
        if (StringUtils.isEmpty(branchName)) {
            return null;
        }
        Optional<Branch> branchOpt = project.findBranchByName(branchName);
        if (branchOpt.isPresent()) {
            if (!plainView) {
                out.println(SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch_already_exists"), branchName)));
            }
            return branchOpt.get();
        } else {
            AddBranchRequest request = new AddBranchRequest();
            request.setName(branchName);
            Branch newBranch = client.addBranch(request);
            if (!plainView) {
                out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch"), branchName)));
            }
            project.addBranchToLocalList(newBranch);
            return newBranch;
        }
    }

    public static String normalizeBranchName(String branch) {
        StringBuilder res = new StringBuilder();
        for (char character : branch.toCharArray()) {
            if (BRANCH_UNALLOWED_SYMBOLS.contains(character)) {
                res.append(".");
            } else {
                res.append(character);
            }
        }
        return res.toString();
    }
}
