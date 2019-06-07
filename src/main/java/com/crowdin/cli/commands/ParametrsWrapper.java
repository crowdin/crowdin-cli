package com.crowdin.cli.commands;

public class ParametrsWrapper {

    private boolean isDebug = false;

    private boolean isVerbose = false;

    public boolean isDebug() {
        return isDebug;
    }

    public void setDebug(boolean debug) {
        isDebug = debug;
    }

    public boolean isVerbose() {
        return isVerbose;
    }

    public void setVerbose(boolean verbose) {
        isVerbose = verbose;
    }
}
