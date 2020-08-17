package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

public abstract class ClientActPlainMixin extends ClientActCommand {

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected final boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }
}
