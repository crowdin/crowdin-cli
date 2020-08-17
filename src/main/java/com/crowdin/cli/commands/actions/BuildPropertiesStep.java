package com.crowdin.cli.commands.actions;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.Step;
import com.crowdin.cli.properties.CliProperties;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.file.FileUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static com.crowdin.cli.BaseCli.DEFAULT_CONFIGS;
import static com.crowdin.cli.BaseCli.DEFAULT_IDENTITY_FILES;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

class BuildPropertiesStep implements Step<PropertiesBean> {

    private File configFile;
    private File identityFile;
    private Params params;

    public BuildPropertiesStep(File configFile, File identityFile, Params params) {
        this.configFile = configFile;
        this.identityFile = identityFile;
        this.params = params;
    }

    @Override
    public PropertiesBean act(Outputter out) {
        if (configFile == null) {
            configFile = getDefaultConfig();
        } else if (!configFile.exists()) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.configuration_file_not_exist"));
        }
        configFile = new File(configFile.getAbsolutePath());
        if (identityFile == null) {
            identityFile = getDefaultIdentityFile();
        } else if (!identityFile.exists()) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.identity_file_not_exist"), identityFile.getAbsolutePath()));
        }
        Path userDir = Paths.get(System.getProperty("user.dir"));
        PropertiesBean pb = (!(Files.notExists(configFile.toPath()) && params != null))
            ? CliProperties.buildFromMap(FileUtils.readYamlFile(configFile))
            : new PropertiesBean();
        if (identityFile != null) {
            CliProperties.populateWithCredentials(pb, FileUtils.readYamlFile(identityFile));
        }
        if (params != null) {
            if (params.getSourceParam() != null && new File(params.getSourceParam()).isAbsolute()) {
                pb.setPreserveHierarchy(false);

                Path root = configFile.toPath().getRoot();
                pb.setBasePath((root != null) ? root.toString() : "/");
                params.setSourceParam(StringUtils.removePattern(params.getSourceParam(), "^([a-zA-Z]:)?[\\\\/]+"));
            }
            CliProperties.populateWithParams(pb, params);
        }
        String basePathIfEmpty = userDir.toString();
        return CliProperties.processProperties(pb, basePathIfEmpty);
    }

    private File getDefaultConfig() {
        if (DEFAULT_CONFIGS == null || DEFAULT_CONFIGS.isEmpty()) {
            throw new RuntimeException("Array of default values for config file is empty");
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
            throw new RuntimeException("Array of default values for config file is empty");
        }
        return DEFAULT_IDENTITY_FILES.stream()
            .map(Paths::get)
            .filter(Files::exists)
            .findFirst()
            .map(Path::toFile)
            .orElse(null);
    }
}
