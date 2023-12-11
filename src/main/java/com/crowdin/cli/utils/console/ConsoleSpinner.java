package com.crowdin.cli.utils.console;

import com.crowdin.cli.commands.Outputter;
import lombok.NonNull;

import java.util.concurrent.Callable;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

public class ConsoleSpinner {

    private static final Object object = new Object();
    private static Spinner worker;

    public static <T> T execute(
        Outputter out, String waitingMessageKey, String errorMessageKey, boolean noProgress, boolean isPlain, @NonNull Callable<T> callable
    ) {
        try {
            if (!isPlain) {
                ConsoleSpinner.start(out, RESOURCE_BUNDLE.getString(waitingMessageKey), noProgress);
            }
            T result = callable.call();
            ConsoleSpinner.stop(OK);
            return result;
        } catch (Exception e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException(RESOURCE_BUNDLE.getString(errorMessageKey), e);
        }
    }

    public static void start(Outputter out, String contextMessage, boolean noProgress) {
        synchronized (object) {
            stop(ExecutionStatus.EMPTY);
            worker = new Spinner(out, contextMessage, noProgress);
            worker.start();
        }
    }

    public static void update(String contextMessage) {
        synchronized (object) {
            if (worker == null) {
                return;
            }
            worker.setMessage(contextMessage);
        }
    }


    public static void stop(ExecutionStatus status) {
        synchronized (object) {
            if (worker == null) {
                return;
            }
            worker.stopSpinning(status);
            worker = null;
        }
    }

    public static void stop(ExecutionStatus status, String message) {
        synchronized (object) {
            if (worker == null) {
                return;
            }
            worker.stopSpinning(status, message);
            worker = null;
        }
    }
}
