package com.crowdin.cli;

import java.io.File;
import java.io.IOException;
import java.net.URL;

public class MockitoUtils {

    public static URL getMockUrl(Class<?> clazz) {
        try {
            return new URL("file://" + clazz.getProtectionDomain().getCodeSource().getLocation().getPath());
        } catch (IOException e) {
            throw new RuntimeException("Couldn't mock url", e);
        }
    }

    public static File getResourceFile(String path, Class clazz) {
        URL fileUrl = clazz.getClassLoader().getResource(path);
        if (fileUrl == null) {
            throw new RuntimeException("Couldn't retrieve resource file from path: "  + path);
        }
        return new File(fileUrl.getFile());
    }
}
