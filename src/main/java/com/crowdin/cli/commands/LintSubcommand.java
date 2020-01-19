package com.crowdin.cli.commands;

import com.crowdin.cli.properties.CliProperties;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.file.FileReader;
import picocli.CommandLine;

import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.Callable;

@CommandLine.Command(name = "lint", description = "Check your configuration file")
public class LintSubcommand extends Command implements Callable<Integer> {

    @CommandLine.Option(names = {"-c", "--config"}, description = "Set path to the configuration file", defaultValue = "crowdin.yml")
    protected Path configFilePath;

    @CommandLine.ArgGroup(exclusive = false, heading = "@|bold config params|@:%n")
    protected Params params;

    @Override
    public Integer call() throws Exception {
        CliProperties cliProperties = new CliProperties();
        PropertiesBean pb = (params != null)
            ? cliProperties.getFromParams(params)
            : cliProperties.loadProperties((new FileReader()).readCliConfig(configFilePath.toFile()));
        List<String> errors = cliProperties.checkProperties(pb);
        if (!errors.isEmpty()) {
            String errorsInOne = String.join("\n\t- ", errors);
//            throw new RuntimeException(RESOURCE_BUNDLE.getString("configuration_file_is_invalid")+"\n\t- " + errorsInOne);
            System.out.println(RESOURCE_BUNDLE.getString("configuration_file_is_invalid")+"\n\t- " + errorsInOne);
        } else {
            System.out.println(RESOURCE_BUNDLE.getString("configuration_ok"));
        }
        return 0;
    }
}
