package com.crowdin.cli.client;

import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.File;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public class CrowdinProjectFull extends CrowdinProject {

    private List<File> files;
    private List<Directory> directories;
    private List<Branch> branches;

    void setFiles(List<File> files) {
        this.files = files;
    }

    void setDirectories(List<Directory> directories) {
        this.directories = directories;
    }

    void setBranches(List<Branch> branches) {
        this.branches = branches;
    }

    public Map<Long, Branch> getBranches() {
        return this.branches
            .stream()
            .collect(Collectors.toMap(Branch::getId, Function.identity()));
    }

    public void addBranchToLocalList(Branch branch) {
        this.branches.add(branch);
    }

    public Optional<Branch> findBranchByName(String branchName) {
        return branches
            .stream()
            .filter(branch -> branch.getName().equals(branchName))
            .findFirst();
    }

    public Map<Long, Directory> getDirectories() {
        return directories
            .stream()
            .collect(Collectors.toMap(Directory::getId, Function.identity()));
    }

    public List<File> getFiles() {
        return files;
    }
}
