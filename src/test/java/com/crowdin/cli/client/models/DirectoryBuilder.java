package com.crowdin.cli.client.models;

import com.crowdin.client.core.model.Priority;
import com.crowdin.client.sourcefiles.model.Directory;

import java.text.ParseException;
import java.text.SimpleDateFormat;

public class DirectoryBuilder {

    private Directory directory;

    public static DirectoryBuilder standard() {
        Directory directory = new Directory();
        directory.setPriority(Priority.NORMAL);
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX");
        try {
            directory.setCreatedAt(dateFormat.parse("2020-03-20T15:44:03+00:00"));
            directory.setUpdatedAt(dateFormat.parse("2020-03-20T15:44:03+00:00"));
        } catch (ParseException e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
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
