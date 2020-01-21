package com.crowdin.cli.commands;

import com.crowdin.cli.utils.Utils;
import picocli.CommandLine;

import java.nio.file.Path;
import java.util.concurrent.Callable;

@CommandLine.Command(
    name = "crowdin"
)
public class GeneralCommand extends Command implements Callable<Integer> {

    @CommandLine.Option(names = {"-c", "--config"}, description = "Set path to the configuration file", defaultValue = "crowdin.yml")
    protected Path configFilePath;

    @CommandLine.Option(names = {"--identity"}, description = "Set path to user-specific credentials")
    protected Path identityFilePath;

    @CommandLine.Option(names = {"--no-progress"}, description = " Disable progress on executing command")
    protected boolean noProgress;

    @CommandLine.Option(names = {"-v", "--verbose"}, description = "Provide more information on the command processing")
    protected boolean isVerbose;

    @Override
    public Integer call() throws Exception {
        System.out.println("configFilePath: " + configFilePath);
        System.out.println("identityFilePath: " + identityFilePath);
        System.out.println("noProgress: " + noProgress);
        System.out.println("isVerbose: " + isVerbose);
        return 0;
    }
}
