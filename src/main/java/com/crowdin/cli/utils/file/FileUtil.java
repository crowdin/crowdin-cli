package com.crowdin.cli.utils.file;

import org.apache.commons.io.IOUtils;

import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

public class FileUtil {

    public static void writeToFile(InputStream data, String filePath) throws IOException {
        FileOutputStream fileOutputStream = new FileOutputStream(filePath);
        IOUtils.copy(data, fileOutputStream);
        fileOutputStream.flush();
        fileOutputStream.close();
    }
}
