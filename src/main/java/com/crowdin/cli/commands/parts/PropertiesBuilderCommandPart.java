package com.crowdin.cli.commands.parts;

import com.crowdin.cli.commands.functionality.PropertiesBuilder;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import picocli.CommandLine;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;

import static com.crowdin.cli.BaseCli.DEFAULT_CONFIGS;
import static com.crowdin.cli.BaseCli.DEFAULT_IDENTITY_FILES;
import static com.crowdin.cli.commands.parts.Command.RESOURCE_BUNDLE;

public class PropertiesBuilderCommandPart {

    @CommandLine.Option(names = {"--identity"}, paramLabel = "...")
    private File identityFile;

    @CommandLine.ArgGroup(exclusive = false, headingKey = "params.heading")
    private Params params;

    @CommandLine.Option(names = {"-c", "--config"}, paramLabel = "...")
    private File configFile;

    public PropertiesBean buildPropertiesBean() {
        if (configFile == null) {
            configFile = getDefaultConfig();
        } else if (!configFile.exists()) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.configuration_file_not_exist"));
        }
        if (identityFile == null) {
            identityFile = getDefaultIdentityFile();
        } else if (!identityFile.exists()) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.identity_file_not_exist"), identityFile.getAbsolutePath()));
        }
        Path userDir = Paths.get(System.getProperty("user.dir"));
        return (new PropertiesBuilder(userDir, new File(configFile.getAbsolutePath()), identityFile, params)).build();
    }

    private File getDefaultConfig() {
        if (DEFAULT_CONFIGS == null || DEFAULT_CONFIGS.length == 0) {
            throw new RuntimeException("Array of default values for config file is empty");
        }
        return Arrays.stream(DEFAULT_CONFIGS)
            .map(Paths::get)
            .filter(Files::exists)
            .findFirst()
            .map(Path::toFile)
            .orElse(new File(DEFAULT_CONFIGS[0]));
    }

    private File getDefaultIdentityFile() {
        if (DEFAULT_IDENTITY_FILES == null || DEFAULT_IDENTITY_FILES.length == 0) {
            throw new RuntimeException("Array of default values for config file is empty");
        }
        return Arrays.stream(DEFAULT_IDENTITY_FILES)
            .map(Paths::get)
            .filter(Files::exists)
            .findFirst()
            .map(Path::toFile)
            .orElse(null);
    }
}
