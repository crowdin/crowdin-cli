package com.crowdin.cli.client.models;

import com.crowdin.common.models.Branch;

public class BranchBuilder {

    private Branch branch;

    public static BranchBuilder standard() {
        Branch branch = new Branch();
        branch.setPriority("normal");
        branch.setCreatedAt("2020-03-20T15:44:03+00:00");
        branch.setUpdatedAt("2020-03-20T15:44:03+00:00");
        return new BranchBuilder(branch);
    }

    protected BranchBuilder(Branch branch) {
        this.branch = branch;
    }

    public BranchBuilder setProjectId(int projectId) {
        branch.setProjectId(projectId);
        return this;
    }

    public BranchBuilder setIdentifiers(String name, Long id) {
        branch.setName(name);
        branch.setId(id);
        return this;
    }

    public Branch build() {
        return branch;
    }
}
