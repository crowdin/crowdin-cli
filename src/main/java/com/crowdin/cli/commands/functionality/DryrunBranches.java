package com.crowdin.cli.commands.functionality;

import com.crowdin.client.sourcefiles.model.Branch;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class DryrunBranches extends Dryrun {

    private Map<Long, Branch> branches;

    public DryrunBranches(Map<Long, Branch> branches) {
        super("message.branch");
        this.branches = branches;
    }

    @Override
    protected List<String> getFiles() {
        return branches.values().stream()
            .map(Branch::getName)
            .collect(Collectors.toList());
    }
}
