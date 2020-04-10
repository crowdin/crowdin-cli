package com.crowdin.cli.utils.console;

import com.crowdin.cli.utils.Utils;

public enum ExecutionStatus {

    OK("[OK] ", "✔️  "),
    ERROR("[ERROR] ", "\u274C "),
    WARNING("[WARNING] ", "⚠️  "),
    SKIPPED("[SKIPPED] ", "\u23ED  "),
    EMPTY("", "");

    private String windowsIcon;
    private String unixIcon;

    ExecutionStatus(String windowsIcon, String unixIcon) {
        this.windowsIcon = windowsIcon;
        this.unixIcon = unixIcon;
    }

    public String getIcon() {
        return Utils.isWindows() ? windowsIcon : unixIcon;
    }

    public String withIcon(String message) {
        return getIcon() + message;
    }
}
