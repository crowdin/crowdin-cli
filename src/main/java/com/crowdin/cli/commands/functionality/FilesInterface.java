package com.crowdin.cli.commands.functionality;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

public interface FilesInterface {

    void writeToFile(String file, InputStream data) throws IOException;

    void copyFile(File fromFile, File toFile);

    List<File> extractZipArchive(File zipArchive, File dir);

    void deleteFile(File file) throws IOException;

    void deleteDirectory(File dir) throws IOException;
}
