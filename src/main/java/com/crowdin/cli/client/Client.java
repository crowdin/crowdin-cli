package com.crowdin.cli.client;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.utils.console.ConsoleSpinner;

import java.util.function.Function;
import java.util.function.Supplier;

public interface Client {

    static  <S> S executeAsyncAction(
            Outputter out,
            String waitingMessage,
            String errorMessage,
            String progressMessage,
            String finalMessage,
            boolean noProgress,
            boolean plainView,
            Supplier<S> initialAction,
            Function<S, S> checkStatusAction,
            Function<S, String> getStatus,
            Function<S, Integer> getProgress
    ) {
        return ConsoleSpinner.execute(
                out,
                waitingMessage,
                errorMessage,
                noProgress,
                plainView,
                () -> {
                    S status = initialAction.get();

                    while (!getStatus.apply(status).equalsIgnoreCase("finished")) {

                        if (progressMessage != null) {
                            ConsoleSpinner.update(String.format(progressMessage, Math.toIntExact(getProgress.apply(status))));
                        }
                        Thread.sleep(1000);

                        status = checkStatusAction.apply(status);

                        if (getStatus.apply(status).equalsIgnoreCase("failed")) {
                            throw new RuntimeException();
                        }
                    }

                    if (finalMessage != null) {
                        ConsoleSpinner.update(finalMessage);
                    }

                    return status;
                }
        );
    }
}
