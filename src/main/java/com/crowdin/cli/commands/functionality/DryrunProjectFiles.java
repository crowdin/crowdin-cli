package com.crowdin.cli.commands.functionality;

import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.File;
import com.crowdin.client.sourcefiles.model.FileInfo;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

public class DryrunProjectFiles extends Dryrun {

    private List<FileInfo> files;
    private Map<Long, Directory> directories;

    public DryrunProjectFiles(List<FileInfo> files, Map<Long, Directory> directories) {
        this.files = files;
        this.directories = directories;
    }

    @Override
    protected List<String> getFiles() {
        return new ArrayList<>(ProjectFilesUtils.buildFilePaths(directories, files).keySet());
    }
}
