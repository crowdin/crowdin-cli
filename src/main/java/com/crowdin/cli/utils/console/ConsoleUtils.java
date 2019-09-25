package com.crowdin.cli.utils.console;

public class ConsoleUtils {

    private static final int ERROR_CODE = 1;
    private static final int SUCCESS_CODE = 0;

    public static void exitError() {
        System.exit(ERROR_CODE);
    }

    public static void exitSuccess() {
        System.exit(SUCCESS_CODE);
    }

    private static String OS = System.getProperty("os.name").toLowerCase();

    public static boolean isWindows() {
        return (OS.contains("win"));
    }

}
