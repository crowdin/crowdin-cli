package com.crowdin.cli.utils.concurrency;

import com.crowdin.cli.utils.OutputUtil;

import java.io.PrintWriter;
import java.util.concurrent.*;

public class CrowdinExecutorService extends ThreadPoolExecutor {

    private boolean debug;

    public CrowdinExecutorService(int corePoolSize, int maximumPoolSize, long keepAliveTime, TimeUnit unit, BlockingQueue<Runnable> workQueue, boolean debug) {
        super(corePoolSize, maximumPoolSize, keepAliveTime, unit, workQueue);
        this.debug = debug;
    }

    public static ExecutorService newFixedThreadPool(int nThreads, boolean debug) {
        return new CrowdinExecutorService(nThreads, nThreads, 0L, TimeUnit.MILLISECONDS, new LinkedBlockingQueue<Runnable>(), debug);
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
            OutputUtil.fancyErr(t, new PrintWriter(System.err), debug);
        }
    }
}
