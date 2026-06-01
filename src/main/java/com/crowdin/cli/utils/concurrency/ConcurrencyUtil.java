package com.crowdin.cli.utils.concurrency;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;

public class ConcurrencyUtil {

    private static final int CROWDIN_API_MAX_CONCURRENT_REQUESTS = 4;
    private static final int MIN_MINUTES_WAIT = 100;

    private ConcurrencyUtil() {
        throw new UnsupportedOperationException();
    }

    /**
     * Executes list of provided tasks in thread pool and waits until all tasks are finished.
     *
     * @param tasks list of tasks to execute in parallel
     */
    public static void executeAndWait(List<Runnable> tasks, boolean debug) {
        run(tasks, CROWDIN_API_MAX_CONCURRENT_REQUESTS, Math.max(tasks.size() * 2, MIN_MINUTES_WAIT), debug);
    }

    public static void executeAndWaitSingleThread(List<Runnable> tasks, boolean debug) {
        run(tasks, 1, MIN_MINUTES_WAIT, debug);
    }

    private static void run(List<Runnable> tasks, int threadQnt, int minutesWait, boolean debug) {
        if (Objects.isNull(tasks) || tasks.isEmpty()) {
            return;
        }
        ExecutorService executor = CrowdinExecutorService.newFixedThreadPool(threadQnt, debug);
        tasks.forEach(executor::submit);
        executor.shutdown();
        try {
            if (!executor.awaitTermination(minutesWait, TimeUnit.MINUTES)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException ex) {
            executor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
