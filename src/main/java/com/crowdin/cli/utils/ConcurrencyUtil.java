package com.crowdin.cli.utils;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class ConcurrencyUtil {

    private static final int CROWDIN_API_MAX_CONCURRENT_REQUESTS = 8;

    private ConcurrencyUtil() {
        throw new UnsupportedOperationException();
    }

    /**
     * Executes list of provided tasks in thread pool and waits until all tasks are finished
     *
     * @param tasks list of tasks to execute in parallel
     */
    public static void executeAndWait(List<Runnable> tasks) {
        if (Objects.isNull(tasks) || tasks.size() == 0) {
            return;
        }
        ExecutorService executor = Executors.newFixedThreadPool(CROWDIN_API_MAX_CONCURRENT_REQUESTS);
        tasks.forEach(executor::submit);
        executor.shutdown();
        try {
            if (!executor.awaitTermination(tasks.size() * 2, TimeUnit.MINUTES)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException ex) {
            executor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
