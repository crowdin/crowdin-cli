package com.crowdin.cli.commands;

public interface Outputter {

    void println(String string);

    void print(String string);

    String format(String string);

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

            @Override
            public String format(String string) {
                return string;
            }
        };
    }
}
