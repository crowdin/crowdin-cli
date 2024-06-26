package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static com.crowdin.cli.BaseCli.DEFAULT_CONFIGS;
import static com.crowdin.cli.BaseCli.DEFAULT_IDENTITY_FILES;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

public class ConfigurationFilesProperties {

    @CommandLine.Option(names = {"-c", "--config"}, paramLabel = "...")
    private File configFile;

    @CommandLine.Option(names = {"--identity"}, paramLabel = "...")
    private File identityFile;

    public File getConfigFile() {
        if (configFile == null) {
            configFile = this.getDefaultConfigFile();
        } else if (!configFile.exists()) {
            throw new ExitCodeExceptionMapper.NotFoundException(RESOURCE_BUNDLE.getString("error.configuration_file_not_exist"));
        } else if (configFile.isDirectory()) {
            throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.file.is_folder"));
        }
        return configFile;
    }

    public File getIdentityFile() {
        if (identityFile == null) {
            identityFile = this.getDefaultIdentityFile();
        } else if (!identityFile.exists()) {
            throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("error.identity_file_not_exist"), identityFile.getAbsolutePath()));
        } else if (configFile.isDirectory()) {
            throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.file.is_folder"));
        }
        return identityFile;
    }

    private File getDefaultConfigFile() {
        if (DEFAULT_CONFIGS == null || DEFAULT_CONFIGS.isEmpty()) {
            throw new ExitCodeExceptionMapper.ValidationException("Array of default values for config file is empty");
        }
        return DEFAULT_CONFIGS.stream()
            .map(Paths::get)
            .filter(Files::exists)
            .findFirst()
            .map(Path::toFile)
            .orElse(new File(DEFAULT_CONFIGS.get(0)));
    }

    private File getDefaultIdentityFile() {
        if (DEFAULT_IDENTITY_FILES == null || DEFAULT_IDENTITY_FILES.isEmpty()) {
            throw new ExitCodeExceptionMapper.ValidationException("Array of default values for config file is empty");
        }
        return DEFAULT_IDENTITY_FILES.stream()
            .map(Paths::get)
            .filter(Files::exists)
            .findFirst()
            .map(Path::toFile)
            .orElse(null);
    }


}
