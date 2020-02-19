package com.crowdin.cli.commands.parts;

import com.crowdin.cli.utils.MessageSource;
import com.crowdin.cli.utils.Utils;
import picocli.CommandLine;

import java.util.ResourceBundle;

@CommandLine.Command(
        name = "command",
        versionProvider = Command.VersionProvider.class,
        usageHelpAutoWidth = true,
        resourceBundle = "messages.messages"
)
public abstract class Command implements Runnable {

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

    protected static final ResourceBundle RESOURCE_BUNDLE = MessageSource.RESOURCE_BUNDLE;

    @Override
    public void run() {
    }

    public static class VersionProvider implements CommandLine.IVersionProvider {
        @Override
        public String[] getVersion() throws Exception {
            return new String[] {Utils.getAppVersion()};
        }
    }
}
