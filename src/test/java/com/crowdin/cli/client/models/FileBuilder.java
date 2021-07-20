package com.crowdin.cli.client.models;

import com.crowdin.client.core.model.Priority;
import com.crowdin.client.sourcefiles.model.File;
import com.crowdin.client.sourcefiles.model.GeneralFileExportOptions;

import java.text.ParseException;
import java.text.SimpleDateFormat;

public class FileBuilder {

    private File file;

    public static FileBuilder standard() {
        File file = new File();
        file.setRevisionId(1L);
        file.setStatus("active");
        file.setPriority(Priority.NORMAL);
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX");
        try {
            file.setCreatedAt(dateFormat.parse("2020-03-20T15:44:03+00:00"));
            file.setUpdatedAt(dateFormat.parse("2020-03-20T15:44:03+00:00"));
        } catch (ParseException e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
        return new FileBuilder(file);
    }

    protected FileBuilder(File file) {
        this.file = file;
    }

    public FileBuilder setProjectId(Long projectId) {
        file.setProjectId(projectId);
        return this;
    }

    public FileBuilder setIdentifiers(String name, String type, Long id, Long directoryId, Long branchId) {
        file.setName(name);
        file.setType(type);
        file.setId(id);
        file.setDirectoryId(directoryId);
        file.setBranchId(branchId);
        return this;
    }

    public FileBuilder setExportPattern(String exportPattern) {
        GeneralFileExportOptions exportOptions = new GeneralFileExportOptions();
        exportOptions.setExportPattern(exportPattern);
        file.setExportOptions(exportOptions);
        return this;
    }

    public File build() {
        return file;
    }
}
