package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.file.FileUtils;
import net.lingala.zip4j.core.ZipFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

public class FsFiles implements FilesInterface {

    @Override
    public void writeToFile(String file, InputStream data) throws IOException {
        FileUtils.writeToFile(data, file);
    }

    @Override
    public void copyFile(File fromFile, File toFile) {
        toFile.getParentFile().mkdirs();
        if (!fromFile.renameTo(toFile)) {
            if (toFile.delete()) {
                if (!fromFile.renameTo(toFile)) {
                    System.out.println(String.format(RESOURCE_BUNDLE.getString("error.replacing_file"), toFile.getAbsolutePath()));
                }
            }
        }
    }

    @Override
    public List<File> extractZipArchive(File zipArchive, File dir) {
        ZipFile zipFile;
        try {
            zipFile = new ZipFile(zipArchive);
        } catch (net.lingala.zip4j.exception.ZipException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.archive_not_exist"), zipArchive.getAbsolutePath()));
        }
        if (!dir.exists()) {
            try {
                java.nio.file.Files.createDirectory(dir.toPath());
            } catch (IOException ex) {
                System.out.println(RESOURCE_BUNDLE.getString("error.creatingDirectory"));
            }
        }
        try {
            zipFile.extractAll(dir.getAbsolutePath());
        } catch (net.lingala.zip4j.exception.ZipException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.extract_archive"), zipArchive.getAbsolutePath()));
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
