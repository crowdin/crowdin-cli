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
    private Branch branch;

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

    public Branch getBranch() {
        return branch;
    }

    public void setBranch(Branch branch) {
        this.branch = branch;
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

    public List<File> getFiles(Long branchId) {
        List<File> result = new ArrayList<>();
        for (File file : this.getFiles()) {
            if (Objects.equals(file.getBranchId(), branchId)) {
                result.add(file);
            }
        }
        return result;
    }

    public List<FileInfo> getFileInfos() {
        return (List<FileInfo>) files;
    }

    public List<FileInfo> getFileInfos(Long branchId) {
        List<FileInfo> result = new ArrayList<>();
        for (FileInfo file : this.getFileInfos()) {
            if (Objects.equals(file.getBranchId(), branchId)) {
                result.add(file);
            }
        }
        return result;
    }
}
