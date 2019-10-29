package com.crowdin.cli.utils.console;

public class ConsoleSpinner {

    private static Spinner worker;

    public static void start(String contextMessage, boolean noProgress) {
        stop(ExecutionStatus.EMPTY);
        worker = new Spinner(contextMessage, noProgress);
        worker.start();
    }


    public static void stop(ExecutionStatus status) {
        if (worker == null) {
            return;
        }
        worker.stopSpinning(status);
        worker = null;
    }
}
