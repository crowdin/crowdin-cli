package com.crowdin.cli.utils;

import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.IntStream;

public class ConsoleSpinner {

    private static Spinner worker;

    public static void start(String contextMessage) {
        System.out.print(contextMessage);
        tryStopWorker();
        worker = new Spinner();
        worker.start();
    }

    public static void stop() {
        tryStopWorker();
    }

    private static void tryStopWorker() {
        if (worker == null) {
            return;
        }
        worker.isSpin = false;
        worker.waitSpinnerFinished();
        worker = null;
    }

    private static class Spinner extends Thread {

        private static final int SPINNER_INTERVAL = 250;

        private static final ReentrantLock lock = new ReentrantLock();

        private int counter;
        private boolean isSpin;

        private final String[] frames = new String[]{
                " - ∙∙∙∙∙",
                " - ●∙∙∙∙",
                " - ∙●∙∙∙",
                " - ∙∙●∙∙",
                " - ∙∙∙●∙",
                " - ∙∙∙∙●",
        };

        private Spinner() {
            setDaemon(true);
        }

        @Override
        public void run() {
            isSpin = true;
            lock.lock();
            while (isSpin) {
                String frame = frames[counter++ % frames.length];
                System.out.print(frame);
                try {
                    Thread.sleep(SPINNER_INTERVAL);
                } catch (InterruptedException e) { /*ignore*/}
                clearFrame(frame);
            }
            lock.unlock();
        }

        private void clearFrame(String frame) {
            IntStream
                    .range(0, frame.length())
                    .forEach(value -> System.out.print("\b"));
        }

        private void waitSpinnerFinished() {
            lock.lock();
            lock.unlock();
        }
    }
}
