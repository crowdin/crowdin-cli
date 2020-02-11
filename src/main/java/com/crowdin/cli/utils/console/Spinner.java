package com.crowdin.cli.utils.console;

import java.util.concurrent.locks.ReentrantLock;

class Spinner extends Thread {

    private static final int SPINNER_INTERVAL = 250;

    private static final ReentrantLock lock = new ReentrantLock();

    private int counter;
    private boolean isSpin;
    private String message;
    private boolean noProgress;

    Spinner(String message, boolean noProgress) {
        this();
        this.message = message;
        this.noProgress = noProgress;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    private final String[] unixFrames = new String[]{
            "[●∙∙∙∙] ",
            "[∙●∙∙∙] ",
            "[∙∙●∙∙] ",
            "[∙∙∙●∙] ",
            "[∙∙∙∙●] ",
    };

    private final String[] windowsFrames = new String[]{
            "[ \\ ] ",
            "[ | ] ",
            "[ / ] ",
            "[ - ] "
    };

    private Spinner() {
    }

    @Override
    public void run() {
        if (noProgress) {
            return;
        }

        isSpin = true;
        lock.lock();

        String[] frames = getFrames();
        while (isSpin) {
            String frame = frames[counter++ % frames.length] + message;
            System.out.print(frame);
            try {
                Thread.sleep(SPINNER_INTERVAL);
            } catch (InterruptedException e) { /*ignore*/}
            clearFrame(frame);
        }
        lock.unlock();
    }

    void stopSpinning(ExecutionStatus status) {
        isSpin = false;
        lock.lock();
        System.out.println(status.getIcon() + message);
        lock.unlock();
    }

    private String[] getFrames() {
        return ConsoleUtils.isWindows() ? windowsFrames : unixFrames;
    }

    private void clearFrame(String frame) {
        int bound = frame.length();
        for (int value = 0; value < bound; value++) {
            System.out.print("\b \b");
        }
    }
}