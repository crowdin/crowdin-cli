package com.crowdin.cli.properties;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.utils.file.FileUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.util.Map;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.properties.PropertiesBuilder.CONFIG_FILE_PATH;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

public class PropertiesBuilders {

    private final boolean isVerbose;

    public PropertiesBuilders(boolean isVerbose) {
        this.isVerbose = isVerbose;
    }

    public PropertiesWithFiles buildPropertiesWithFiles(Outputter out, File configFile, File identityFile, ParamsWithFiles params) {
        return new PropertiesWithFilesBuilder(out)
            .addConfigParams((fileExists(configFile) || params.isEmpty()) ? readConfigFile(out, configFile, isParamsContainBasePath(params)) : null)
            .addIdentityParams((identityFile != null) ? loadCreds(identityFile, out) : null)
            .addParams(params)
            .build();
    }

    public ProjectProperties buildProjectProperties(Outputter out, File configFile, File identityFile, ProjectParams params) {
        return new ProjectPropertiesBuilder(out)
            .addConfigParams((fileExists(configFile)) ? readConfigFile(out, configFile, isParamsContainBasePath(params)) : null)
            .addIdentityParams((identityFile != null) ? loadCreds(identityFile, out) : null)
            .addParams(params)
            .build();
    }

    public BaseProperties buildBaseProperties(Outputter out, File configFile, File identityFile, BaseParams params) {
        return new BasePropertiesBuilder(out)
            .addConfigParams((fileExists(configFile)) ? readConfigFile(out, configFile, isParamsContainBasePath(params)) : null)
            .addIdentityParams((identityFile != null) ? loadCreds(identityFile, out) : null)
            .addParams(params)
            .build();
    }

    public AllProperties buildChecker(Outputter out, File configFile, File identityFile, NoParams params) {
        return new PropertiesBuilderChecker(out)
            .addConfigParams((fileExists(configFile)) ? readConfigFile(out, configFile, false) : null)
            .addIdentityParams((identityFile != null) ? loadCreds(identityFile, out) : null)
            .addParams(params)
            .build();
    }

    private Map<String, Object> readConfigFile(Outputter out, File configFile, boolean skipFilePath) {
        Map<String, Object> configFileParams = loadConfig(configFile, out);
        if (!skipFilePath) {
            configFileParams.put(CONFIG_FILE_PATH, configFile.getAbsoluteFile().getParentFile().getAbsolutePath());
        }
        return configFileParams;
    }

    private boolean isParamsContainBasePath(BaseParams params) {
        return params != null && StringUtils.isNotEmpty(params.getBasePathParam());
    }

    private boolean fileExists(File file) {
        return file != null && file.exists();
    }

    public NoProperties buildNoProperties() {
        return new NoProperties();
    }

    private Map<String, Object> loadConfig(File configFile, Outputter out) {
        return loadAndLog(configFile, out, "message.config.read");
    }

    private Map<String, Object> loadCreds(File configFile, Outputter out) {
        return loadAndLog(configFile, out, "message.creds.read");
    }

    private Map<String, Object> loadAndLog(File file, Outputter out, String messageTemplate) {
        var res = FileUtils.readYamlFile(file);
        if (isVerbose) {
            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString(messageTemplate), file.getAbsolutePath())));
        }
        return res;
    }
}
