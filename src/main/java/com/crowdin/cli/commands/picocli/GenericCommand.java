package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.Outputter;
import picocli.CommandLine;

import java.util.Collections;
import java.util.List;
import java.util.ResourceBundle;
import java.util.stream.Collectors;

@CommandLine.Command(
        name = "command",
        versionProvider = PicocliRunner.VersionProvider.class,
        usageHelpAutoWidth = true,
        resourceBundle = "messages.messages"
)
abstract class GenericCommand implements Runnable {

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

    private static Actions actions;

    public static void init(Actions actions) {
        GenericCommand.actions = actions;
    }

    @Override
    public final void run() {
        List<String> errors = checkOptions();
        if (errors != null && !errors.isEmpty()) {
            String errorsInOne = errors.stream()
                .map(error -> String.format(RESOURCE_BUNDLE.getString("message.item_list"), error))
                .collect(Collectors.joining("\n"));
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.params_are_invalid") + "\n" + errorsInOne);
        }
        Outputter out = new PicocliOutputter(System.out, isAnsi());
        act(actions, out);
    }

    protected abstract void act(Actions actions, Outputter out);

    protected List<String> checkOptions() {
        return Collections.emptyList();
    }

    protected boolean isAnsi() {
        return !this.noColors;
    }


}
