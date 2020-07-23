package com.crowdin.cli.properties.helper;

import com.crowdin.cli.utils.Utils;
import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

public class TempProject {

    public static final String SEP = (System.getProperty("file.separator").equals("\\") ? "\\\\" : "/");
    private Path dir;

    public TempProject(Class clazz) {
        this(clazz.getName().replaceAll("\\.", "_"));
    }

    public TempProject(String name) {
        try {
            dir = Files.createTempDirectory(name).toRealPath();
        } catch (IOException e) {
            throw new RuntimeException("Couldn't create temp folder", e);
        }
    }

    public String getBasePath() {
        return dir.toString() + Utils.PATH_SEPARATOR;
    }

    public File addFile(String path) {
        try {
            Path file = dir.resolve(path);
            Path parentFile = file.getParent();
            if (parentFile != null) {
                Files.createDirectories(parentFile);
            }
            Files.createFile(file);
            return file.toFile();
        } catch (IOException e) {
            throw new RuntimeException("couldn't add file to folder", e);
        }
    }

    public File addFile(String path, String text) {
        try {
            Path file = dir.resolve(path);
            Path parentFile = file.getParent();
            if (parentFile != null) {
                Files.createDirectories(parentFile);
            }
            Files.createFile(file);
            Files.write(file, Arrays.asList(text.split("\\n")));
            return file.toFile();
        } catch (IOException e) {
            throw new RuntimeException("couldn't add file to folder", e);
        }
    }

    public Path addDirectory(String path) {
        try {
            return Files.createDirectory(dir.resolve(path));
        } catch (IOException e) {
            throw new RuntimeException("Couldn't create a directory", e);
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
