package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.Utils;
import com.crowdin.common.models.Directory;
import com.crowdin.common.models.FileEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

public class DryrunProjectFiles extends Dryrun {

    private List<FileEntity> files;
    private List<Directory> directories;
    private Map<Long, String> branches;
    private Long branchId;

    public DryrunProjectFiles(List<FileEntity> files, List<Directory> directories, Map<Long, String> branches, Long branchId) {
        this.files = files;
        this.directories = directories;
        this.branches = branches;
        this.branchId = branchId;
    }

    @Override
    protected List<String> getFiles() {
        Map<Long, Directory> directoriesMap = directories.stream()
                .collect(Collectors.toMap(Directory::getId, Function.identity()));
        List<String> paths = new ArrayList<>();
        for (FileEntity file : files) {
            StringBuilder sb = new StringBuilder(Utils.PATH_SEPARATOR + file.getName());
            Long directoryId = file.getDirectoryId();
            if (directoryId == null && !Objects.equals(file.getBranchId(), branchId)) {
                continue;
            }
            Directory parent = null;
            while (directoryId != null) {
                parent = directoriesMap.get(directoryId);
                sb.insert(0, Utils.PATH_SEPARATOR + parent.getName());
                directoryId = parent.getDirectoryId();
            }
            if (parent != null && !Objects.equals(parent.getBranchId(), branchId)) {
                continue;
            }
            if (parent != null && parent.getBranchId() != null) {
                sb.insert(0, Utils.PATH_SEPARATOR + branches.get(parent.getBranchId()));
            } else if (file.getBranchId() != null) {
                sb.insert(0, Utils.PATH_SEPARATOR + branches.get(file.getBranchId()));
            }
            paths.add(sb.toString());
        }
        return paths;
    }
}
