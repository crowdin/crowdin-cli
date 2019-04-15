package com.crowdin.cli.utils;

public class ConsoleUtil {

    private static final int ERROR_CODE = 1;
    private static final int SUCCESS_CODE = 0;

    public static void exitError() {
        System.exit(ERROR_CODE);
    }

    public static void exitSuccess() {
        System.exit(SUCCESS_CODE);
    }
}
