package com.crowdin.cli.client;

import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.File;
import com.crowdin.client.sourcefiles.model.FileInfo;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

public class CrowdinProjectFull extends CrowdinProject {

    private List<? extends FileInfo> files;
    private List<Directory> directories;
    private List<Branch> branches;
    private Branch currentBranch;

    void setFiles(List<? extends FileInfo> files) {
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

    public void setCurrentBranch(Branch branch) {
        if (!branches.contains(branch)) {
            branches.add(branch);
        }
        currentBranch = branch;
    }

    public Optional<Branch> findBranchByName(String branchName) {
        return branches
            .stream()
            .filter(branch -> branch.getName().equals(branchName))
            .findFirst();
    }

    public Optional<Long> getCurrentBranchId() {
        return Optional.ofNullable(currentBranch).map(Branch::getId);
    }

    public Optional<Branch> getCurrentBranch() {
        return Optional.ofNullable(currentBranch);
    }

    public Map<Long, Directory> getDirectories() {
        return directories
            .stream()
            .collect(Collectors.toMap(Directory::getId, Function.identity()));
    }

    public Map<Long, Directory> getDirectories(Long branchId) {
        return directories
            .stream()
            .filter(dir -> Objects.equals(dir.getBranchId(), branchId))
            .collect(Collectors.toMap(Directory::getId, Function.identity()));
    }

    /**
     * returns list of files. Should be checked with isManagerAccess. Otherwise use getFileInfos()
     * @return list of files
     */
    public List<File> getFiles() {
        if (files.isEmpty()) {
            return new ArrayList<>();
        } else {
            FileInfo first = files.get(0);
            if (first instanceof File) {
                return (List<File>) files;
            } else {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("message.no_manager_access"));
            }
        }
    }

    public List<FileInfo> getFileInfos() {
        return (List<FileInfo>) files;
    }

}
