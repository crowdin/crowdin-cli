package com.crowdin.cli.commands.parts;

import com.crowdin.cli.utils.MessageSource;
import com.crowdin.cli.utils.Utils;
import picocli.CommandLine;

import java.util.ResourceBundle;

@CommandLine.Command(
        name = "crowdin",
        versionProvider = Command.VersionProvider.class,
        mixinStandardHelpOptions = true,
        synopsisHeading = "%n@|underline SYNOPSIS|@:%n",
        descriptionHeading = "%n@|underline DESCRIPTION|@:%n",
        parameterListHeading = "%n@|underline PARAMETERS|@:%n",
        optionListHeading = "%n@|underline OPTIONS|@:%n",
        commandListHeading = "%n@|underline COMMANDS|@:%n",
        usageHelpAutoWidth = true
)
public abstract class Command implements Runnable {

    @CommandLine.Option(names = {"--no-progress"}, description = "Disable progress on executing command")
    protected boolean noProgress;

    @CommandLine.Option(names = {"-v", "--verbose"}, description = "Provide more information on the command processing")
    protected boolean isVerbose;

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
