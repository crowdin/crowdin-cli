package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.actions.Outputter;
import picocli.CommandLine;

import java.io.PrintStream;

class PicocliOutputter implements Outputter {

    private PrintStream out;
    private CommandLine.Help.Ansi ansi;

    public PicocliOutputter(PrintStream out, boolean isOn) {
        this.out = out;
        this.ansi = (isOn) ? CommandLine.Help.Ansi.AUTO : CommandLine.Help.Ansi.OFF;
    }
    @Override
    public void println(String string) {
        this.out.println(ansi(string));
    }

    @Override
    public void print(String string) {
        this.out.print(ansi(string));
    }

    private String ansi(String string) {
        return ansi.string(string);
    }
}
