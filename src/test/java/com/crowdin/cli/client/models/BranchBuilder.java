package com.crowdin.cli.client.models;


import com.crowdin.client.core.model.Priority;
import com.crowdin.client.sourcefiles.model.Branch;

import java.text.ParseException;
import java.text.SimpleDateFormat;

public class BranchBuilder {

    private Branch branch;

    public static BranchBuilder standard() {
        Branch branch = new Branch();
        branch.setPriority(Priority.NORMAL);
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX");
        try {
            branch.setCreatedAt(dateFormat.parse("2020-03-20T15:44:03+00:00"));
            branch.setUpdatedAt(dateFormat.parse("2020-03-20T15:44:03+00:00"));
        } catch (ParseException e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
        return new BranchBuilder(branch);
    }

    protected BranchBuilder(Branch branch) {
        this.branch = branch;
    }

    public BranchBuilder setProjectId(Long projectId) {
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
