package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.file.FileUtils;
import net.lingala.zip4j.ZipFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static java.nio.file.StandardCopyOption.REPLACE_EXISTING;

public class FsFiles implements FilesInterface {

    @Override
    public void writeToFile(String file, InputStream data) throws IOException {
        FileUtils.writeToFile(data, file);
    }

    @Override
    public void copyFile(File fromFile, File toFile) {
        try {
            if (toFile.toPath().getParent() != null) {
                Files.createDirectories(toFile.toPath().getParent());
            }
            java.nio.file.Files.copy(fromFile.toPath(), toFile.toPath(), REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.replacing_file"), toFile.getAbsolutePath()), e);
        }
    }

    @Override
    public List<File> extractZipArchive(File zipArchive, File dir) {
        ZipFile zipFile;
        try {
            zipFile = new ZipFile(zipArchive);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.archive_not_exist"), zipArchive.getAbsolutePath()));
        }
        if (!dir.exists()) {
            try {
                java.nio.file.Files.createDirectory(dir.toPath());
            } catch (IOException ex) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.creatingDirectory"));
            }
        }
        Integer filesQnt = null;
        try {
            filesQnt = zipFile.getFileHeaders().size();
            zipFile.extractAll(dir.getAbsolutePath());
        } catch (net.lingala.zip4j.exception.ZipException e) {
            if (filesQnt != null && filesQnt.equals(1)) {
                return new ArrayList<>();
            } else {
                throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.extract_archive"), zipArchive.getAbsolutePath()));
            }
        }
        try {
            return java.nio.file.Files.walk(dir.toPath())
                .filter(java.nio.file.Files::isRegularFile)
                .map(Path::toFile)
                .collect(Collectors.toList());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void deleteFile(File file) throws IOException {
        java.nio.file.Files.delete(file.toPath());
    }

    @Override
    public void deleteDirectory(File dir) throws IOException {
        org.apache.commons.io.FileUtils.deleteDirectory(dir);
    }
}
