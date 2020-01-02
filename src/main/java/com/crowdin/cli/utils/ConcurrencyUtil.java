package com.crowdin.cli.utils;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.*;
import java.util.stream.Collectors;

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
        List<Future<?>> futures = tasks
            .stream()
            .map(executor::submit)
            .collect(Collectors.toList());
        try {
            for(Future<?> future : futures) {
                try {
                    future.get(2, TimeUnit.MINUTES);
                } catch (ExecutionException e) {
                    System.out.println(e.getMessage());
                }
            }
        } catch (InterruptedException | TimeoutException e) {
            executor.shutdownNow();
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }
}
