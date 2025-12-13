package com.crowdin.cli.client;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.utils.console.ConsoleSpinner;

import java.util.function.Function;
import java.util.function.Supplier;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

public interface Client {

    static <S> S executeAsyncAction(
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
                            var progressMsg = RESOURCE_BUNDLE.containsKey(progressMessage) ? RESOURCE_BUNDLE.getString(progressMessage) : progressMessage;
                            ConsoleSpinner.update(String.format(progressMsg, Math.toIntExact(getProgress.apply(status))));
                        }
                        Thread.sleep(1000);

                        status = checkStatusAction.apply(status);

                        if (getStatus.apply(status).equalsIgnoreCase("failed")) {
                            throw new RuntimeException();
                        }
                    }

                    if (finalMessage != null) {
                        var finalMsg = RESOURCE_BUNDLE.containsKey(finalMessage) ? RESOURCE_BUNDLE.getString(finalMessage) : finalMessage;
                        ConsoleSpinner.update(finalMsg);
                    }

                    return status;
                }
        );
    }
}
