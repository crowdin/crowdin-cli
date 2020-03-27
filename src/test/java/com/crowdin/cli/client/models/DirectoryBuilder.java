package com.crowdin.cli.client.models;

import com.crowdin.common.models.Directory;

public class DirectoryBuilder {

    private Directory directory;

    public static DirectoryBuilder standard() {
        Directory directory = new Directory();
        directory.setPriority("normal");
        directory.setCreatedAt("2020-03-20T15:44:03+00:00");
        directory.setUpdatedAt("2020-03-20T15:44:03+00:00");
        return new DirectoryBuilder(directory);
    }

    protected DirectoryBuilder(Directory directory) {
        this.directory = directory;
    }

    public DirectoryBuilder setProjectId(Long projectId) {
        directory.setProjectId(projectId);
        return this;
    }

    public DirectoryBuilder setIdentifiers(String name, Long id, Long directoryId, Long branchId) {
        directory.setName(name);
        directory.setId(id);
        directory.setDirectoryId(directoryId);
        directory.setBranchId(branchId);
        return this;
    }

    public Directory build() {
        return directory;
    }
}
