package com.crowdin.cli.utils.concurrency;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.*;

public class ConcurrencyUtil {

    private static final int CROWDIN_API_MAX_CONCURRENT_REQUESTS = 4;

    private ConcurrencyUtil() {
        throw new UnsupportedOperationException();
    }

    /**
     * Executes list of provided tasks in thread pool and waits until all tasks are finished
     *
     * @param tasks list of tasks to execute in parallel
     */
    public static void executeAndWait(List<Runnable> tasks, boolean debug) {
        run(tasks, CROWDIN_API_MAX_CONCURRENT_REQUESTS, tasks.size() * 2, debug);

    }

    public static void executeAndWaitSingleThread(List<Runnable> tasks, boolean debug) {
        run(tasks, 1, 100, debug);
    }

    private static void run(List<Runnable> tasks, int threadQnt, int minutesWait, boolean debug) {
        if (Objects.isNull(tasks) || tasks.size() == 0) {
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
