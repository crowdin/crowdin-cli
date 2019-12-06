package com.crowdin.cli.properties.helper;

import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class TempProject {

    public static final String SEP = (System.getProperty("file.separator").equals("\\") ? "\\\\" : "/");
    private Path dir;

    public TempProject(Class clazz) {
        this(clazz.getName().replaceAll("\\.", "_"));
    }

    public TempProject(String name) {
        try {
            dir = Files.createTempDirectory(name);
        } catch (IOException e) {
            throw new RuntimeException("Couldn't create temp folder", e);
        }
    }

    public String getBasePath() {
        return dir.toString();
    }

    public File addFile(String path) {
        try {
            Path file = dir.resolve(path);
            Files.createDirectories(file.getParent());
            Files.createFile(file);
            return file.toFile();
        } catch (IOException e) {
            throw new RuntimeException("couldn't add file to folder", e);
        }
    }

    public void delete() {
        try {
            FileUtils.deleteDirectory(dir.toFile());
        } catch (IOException e) {
            throw new RuntimeException("Couldn't delete directory after tests", e);
        }
    }

}
