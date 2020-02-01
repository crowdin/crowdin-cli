package com.crowdin.cli.commands.parts;

import com.crowdin.cli.properties.CliProperties;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.CommandUtils;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.file.FileReader;
import picocli.CommandLine;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;

public abstract class PropertiesBuilderCommandPart extends Command {

    @CommandLine.ArgGroup(exclusive = false, heading = "@|bold config params|@:%n")
    private Params params;

    @CommandLine.Option(names = {"-c", "--config"}, paramLabel = "...", description = "Set path to the configuration file", defaultValue = "crowdin.yml")
    private Path configFilePath;

    private CommandUtils commandUtils = new CommandUtils();
    private CliProperties cliProperties = new CliProperties();

    protected PropertiesBean buildPropertiesBean() {
        PropertiesBean pb = readProperties();
        return processProperties(pb);
    }

    private PropertiesBean readProperties() {
        return (params != null)
            ? cliProperties.getFromParams(params)
            : cliProperties.loadProperties((new FileReader()).readCliConfig(configFilePath.toFile()));
    }

    private PropertiesBean processProperties(PropertiesBean pb) {
        cliProperties.validateProperties(pb);
        pb.setBasePath(getBasePath(pb.getBasePath(), configFilePath.toFile(), false));
        return pb;
    }

    private String getBasePath(String basePath, File configurationFile, boolean isDebug) {
        String result = "";
        if (basePath != null && Paths.get(basePath) != null) {
            if (Paths.get(basePath).isAbsolute()) {
                result = basePath;
            } else if (configurationFile != null && configurationFile.isFile()) {
                basePath = ".".equals(basePath) ? "" : basePath;
                Path parentPath = Paths.get(configurationFile.getAbsolutePath()).getParent();
                File base = new File(parentPath.toFile(), basePath);
                try {
                    result = base.getCanonicalPath();
                } catch (IOException e) {
                    System.out.println(RESOURCE_BUNDLE.getString("bad_base_path"));
                    if (isDebug) {
                        e.printStackTrace();
                    }
                }
            } else {
                try {
                    result = new File(basePath).getCanonicalPath();
                } catch (IOException e) {
                    System.out.println(RESOURCE_BUNDLE.getString("bad_base_path"));
                    if (isDebug) {
                        e.printStackTrace();
                    }
                }
            }
        } else if (configurationFile != null && configurationFile.isFile()) {
            basePath = (basePath == null) ? "" : basePath;
            result = Paths.get(configurationFile.getAbsolutePath()).getParent() + Utils.PATH_SEPARATOR + basePath;
            result = result.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
        }
        return result;
    }
}
