package com.crowdin.cli.utils;

public class ConsoleSpinner {

    private static final int SPINNER_TIMEOUT = 250;
    private Spinner worker;

    public void start() {
        tryStopWorker();
        worker = new Spinner();
        worker.start();
    }

    public void stop() {
        tryStopWorker();
    }

    private void tryStopWorker() {
        if (worker != null) {
            worker.isSpin = false;
            try {
                worker.join();
            } catch (InterruptedException e) {
                /*ignore*/
            }
            worker = null;
        }
    }

    private class Spinner extends Thread {

        private int counter;
        private boolean isSpin;

        private Spinner() {
            setDaemon(true);
        }

        @Override
        public void run() {
            isSpin = true;
            while (isSpin) {
                switch (counter++ % 4) {
                    case 0:
                        System.out.print("/");
                        break;
                    case 1:
                        System.out.print("-");
                        break;
                    case 2:
                        System.out.print("\\");
                        break;
                    case 3:
                        System.out.print("|");
                        break;
                }
                try {
                    Thread.sleep(SPINNER_TIMEOUT);
                } catch (InterruptedException e) { /*ignore*/}
                System.out.print("\b");
            }
        }
    }
}
