package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.BaseCli;
import picocli.CommandLine;

import java.util.ResourceBundle;

@CommandLine.Command(
    name = "command",
    versionProvider = PicocliRunner.VersionProvider.class,
    usageHelpAutoWidth = true,
    resourceBundle = "messages.messages"
)
public abstract class GenericCommand implements Runnable {

    @CommandLine.Option(names = {"-V", "--version"}, versionHelp = true)
    boolean versionInfoRequested;

    @CommandLine.Option(names = {"-h", "--help"}, usageHelp = true)
    boolean usageHelpRequested;

    @CommandLine.Option(names = {"--no-progress"})
    protected boolean noProgress;

    @CommandLine.Option(names = {"-v", "--verbose"})
    protected boolean isVerbose;

    @CommandLine.Option(names = {"--debug"}, hidden = true)
    protected boolean debug;

    @CommandLine.Option(names = {"--no-colors"})
    protected boolean noColors;

    protected static final ResourceBundle RESOURCE_BUNDLE = BaseCli.RESOURCE_BUNDLE;

    @Override
    public abstract void run();
}
