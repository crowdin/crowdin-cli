package com.crowdin.cli.commands;

public interface Step<A> {
    A act(Outputter out);
}