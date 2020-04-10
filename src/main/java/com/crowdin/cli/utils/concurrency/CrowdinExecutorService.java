package com.crowdin.cli.utils.concurrency;

import java.util.concurrent.*;

public class CrowdinExecutorService extends ThreadPoolExecutor {

    public CrowdinExecutorService(int corePoolSize, int maximumPoolSize, long keepAliveTime, TimeUnit unit, BlockingQueue<Runnable> workQueue) {
        super(corePoolSize, maximumPoolSize, keepAliveTime, unit, workQueue);
    }

    public static ExecutorService newFixedThreadPool(int nThreads) {
        return new CrowdinExecutorService(nThreads, nThreads, 0L, TimeUnit.MILLISECONDS, new LinkedBlockingQueue<Runnable>());
    }

    @Override
    protected void afterExecute(Runnable r, Throwable t) {
        super.afterExecute(r, t);
        if (t == null && r instanceof Future<?>) {
            try {
                Future<?> future = (Future<?>) r;
                if (future.isDone()) {
                    future.get();
                }
            } catch (CancellationException ce) {
                t = ce;
            } catch (ExecutionException ee) {
                t = ee.getCause();
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            }
        }
        if (t != null) {
            Throwable tempE = t;
            System.out.println(t.getMessage());
            while ((tempE = tempE.getCause()) != null) {
                System.out.println(tempE.getMessage());
            }
        }
    }
}
