package com.crowdin.cli.utils.concurrency;

import com.crowdin.cli.utils.OutputUtil;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

class CrowdinExecutorService extends ThreadPoolExecutor {

    private boolean debug;

    public CrowdinExecutorService(
        int corePoolSize, int maximumPoolSize, long keepAliveTime, TimeUnit unit, BlockingQueue<Runnable> workQueue, boolean debug
    ) {
        super(corePoolSize, maximumPoolSize, keepAliveTime, unit, workQueue);
        this.debug = debug;
    }

    public static ExecutorService newFixedThreadPool(int numThreads, boolean debug) {
        return new CrowdinExecutorService(numThreads, numThreads, 0L, TimeUnit.MILLISECONDS, new LinkedBlockingQueue<Runnable>(), debug);
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
            OutputUtil.fancyErr(t, System.err, debug);
        }
    }
}
