package com.crowdin.cli.commands.functionality;

import com.crowdin.common.models.Branch;
import com.crowdin.common.models.Directory;
import com.crowdin.common.models.FileEntity;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

public class DryrunProjectFiles extends Dryrun {

    private List<FileEntity> files;
    private Map<Long, Directory> directories;
    private Map<Long, Branch> branches;
    private Long branchId;

    public DryrunProjectFiles(List<FileEntity> files, Map<Long, Directory> directories, Map<Long, Branch> branches, Long branchId) {
        this.files = files;
        this.directories = directories;
        this.branches = branches;
        this.branchId = branchId;
    }

    @Override
    protected List<String> getFiles() {
        return ProjectFilesUtils.buildFilePaths(directories, branches, files).entrySet().stream()
            .filter(entry -> Objects.equals(entry.getValue().getBranchId(), branchId))
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }
}
