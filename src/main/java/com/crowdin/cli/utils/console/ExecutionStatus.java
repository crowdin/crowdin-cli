package com.crowdin.cli.utils.console;

public enum ExecutionStatus {

    OK("[OK] ", "\u2714  "),
    ERROR("[ERROR] ", "\u26D4  "),
    WARNING("[WARNING] ", "\u26A0  "),
    SKIPPED("[SKIPPED] ", "\u23ED  "),
    EMPTY("", "");

    private String windowsIcon;
    private String unixIcon;

    ExecutionStatus(String windowsIcon, String unixIcon) {
        this.windowsIcon = windowsIcon;
        this.unixIcon = unixIcon;
    }

    public String getIcon() {
        return ConsoleUtils.isWindows() ? windowsIcon : unixIcon;
    }

    public String withIcon(String message) {
        return getIcon() + message;
    }
}
