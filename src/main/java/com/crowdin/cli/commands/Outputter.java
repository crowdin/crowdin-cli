package com.crowdin.cli.commands;

public interface Outputter {

    void println(String string);

    void print(String string);

    static Outputter getDefault() {
        return new Outputter() {
            @Override
            public void println(String string) {
                System.out.println(string);
            }

            @Override
            public void print(String string) {
                System.out.print(string);
            }
        };
    }
}
