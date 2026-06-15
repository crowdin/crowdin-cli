package com.crowdin.cli;

/**
 * Bootstrap entry point for the CLI.
 *
 * <p>The rest of the CLI is compiled for Java 17, so on an older runtime the JVM fails to load
 * {@link Cli} with a raw {@code UnsupportedClassVersionError} and a stack trace before any of our
 * code gets a chance to run. This class is compiled for an older release (see the {@code launcher}
 * source set in {@code build.gradle}), so it loads on any JVM, checks the runtime version, and
 * prints a clear message instead. On a supported runtime it simply delegates to {@link Cli}.
 */
public final class Launcher {

    static final int MIN_JAVA_MAJOR = 17;

    private Launcher() {
    }

    public static void main(String[] args) {
        int major = parseMajor(System.getProperty("java.specification.version"));
        if (major > 0 && major < MIN_JAVA_MAJOR) {
            System.err.println("Crowdin CLI requires Java " + MIN_JAVA_MAJOR
                + " or higher. Detected version: " + System.getProperty("java.version"));
            System.err.println("Please update your Java Runtime Environment.");
            System.exit(1);
            return;
        }
        Cli.main(args);
    }

    /**
     * Extracts the major version from a {@code java.specification.version} value, supporting both
     * the legacy {@code "1.8"} scheme and the modern {@code "17"} scheme. Returns {@code 0} when the
     * value is missing or unparseable, in which case the caller starts the CLI rather than blocking
     * a user over an unrecognized version string.
     */
    static int parseMajor(String specVersion) {
        if (specVersion == null) {
            return 0;
        }
        String value = specVersion.trim();
        if (value.isEmpty()) {
            return 0;
        }
        if (value.startsWith("1.")) {
            value = value.substring(2);
        }
        int separator = value.indexOf('.');
        if (separator != -1) {
            value = value.substring(0, separator);
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
