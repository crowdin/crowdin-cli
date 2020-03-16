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

import static com.crowdin.cli.BaseCli.defaultConfigs;
import static com.crowdin.cli.BaseCli.defaultIdentityFiles;

public abstract class PropertiesBuilderCommandPart extends Command {

    @CommandLine.Option(names = {"--identity"}, paramLabel = "...")
    private File identityFile;

    @CommandLine.ArgGroup(exclusive = false, headingKey = "params.heading")
    private Params params;

    @CommandLine.Option(names = {"-c", "--config"}, paramLabel = "...")
    private File configFile;

    protected PropertiesBean buildPropertiesBean() {
        if (configFile == null) {
            configFile = getDefaultConfig();
        }
        if (identityFile == null) {
            identityFile = getDefaultIdentityFile();
        }
        Path userDir = Paths.get(System.getProperty("user.dir"));
        return (new PropertiesBuilder(userDir, new File(configFile.getAbsolutePath()), identityFile, params)).build();
    }

    private File getDefaultConfig() {
        if (defaultConfigs == null || defaultConfigs.length == 0) {
            throw new RuntimeException("Array of default values for config file is empty");
        }
        return Arrays.stream(defaultConfigs)
            .map(Paths::get)
            .filter(Files::exists)
            .findFirst()
            .map(Path::toFile)
            .orElse(new File(defaultConfigs[0]));
    }

    private File getDefaultIdentityFile() {
        if (defaultIdentityFiles == null || defaultIdentityFiles.length == 0) {
            throw new RuntimeException("Array of default values for config file is empty");
        }
        return Arrays.stream(defaultIdentityFiles)
            .map(Paths::get)
            .filter(Files::exists)
            .findFirst()
            .map(Path::toFile)
            .orElse(null);
    }
}
