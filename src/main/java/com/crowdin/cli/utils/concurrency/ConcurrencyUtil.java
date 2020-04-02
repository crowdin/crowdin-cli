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
    public static void executeAndWait(List<Runnable> tasks) {
        run(tasks, CROWDIN_API_MAX_CONCURRENT_REQUESTS);

    }

    public static void executeAndWaitSingleThread(List<Runnable> tasks) {
        run(tasks, 1);
    }

    private static void run(List<Runnable> tasks, int threadQnt) {
        if (Objects.isNull(tasks) || tasks.size() == 0) {
            return;
        }
        ExecutorService executor = CrowdinExecutorService.newFixedThreadPool(threadQnt);
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
