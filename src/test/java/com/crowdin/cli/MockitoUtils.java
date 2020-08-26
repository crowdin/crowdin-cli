package com.crowdin.cli;

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
}
