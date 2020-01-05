package com.crowdin.cli.utils.file;

import org.apache.commons.io.IOUtils;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

public class FileUtil {

    public static void writeToFile(InputStream data, String filePath) throws IOException {
        Path parentDirectory = Paths.get(filePath).getParent();
        if (parentDirectory != null) {
            Files.createDirectories(parentDirectory);
        }
        FileOutputStream fileOutputStream = new FileOutputStream(filePath);
        IOUtils.copy(data, fileOutputStream);
        fileOutputStream.flush();
        fileOutputStream.close();
    }

    public static List<String> readFile(File file) {
        List<String> lines = new ArrayList<>();
        try {
            Scanner in = new Scanner(file);
            while (in.hasNextLine()) {
                lines.add(in.nextLine());
            }
        } catch (IOException e) {
            throw new RuntimeException("Couldn't read from file '" + file.toString() + "'", e);
        }
        return lines;
    }
}
