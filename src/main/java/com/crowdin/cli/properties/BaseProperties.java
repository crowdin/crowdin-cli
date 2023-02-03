package com.crowdin.cli.properties;

import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.utils.Utils;
import lombok.Data;
import lombok.NonNull;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.io.IOException;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.properties.PropertiesBuilder.API_TOKEN;
import static com.crowdin.cli.properties.PropertiesBuilder.API_TOKEN_ENV;
import static com.crowdin.cli.properties.PropertiesBuilder.BASE_PATH;
import static com.crowdin.cli.properties.PropertiesBuilder.BASE_PATH_ENV;
import static com.crowdin.cli.properties.PropertiesBuilder.BASE_URL;
import static com.crowdin.cli.properties.PropertiesBuilder.BASE_URL_ENV;
import static com.crowdin.cli.properties.PropertiesBuilder.CONFIG_FILE_PATH;
import static com.crowdin.cli.properties.PropertiesBuilder.SETTINGS;
import static com.crowdin.cli.properties.PropertiesBuilder.checkBasePathExists;
import static com.crowdin.cli.properties.PropertiesBuilder.checkBasePathIsDir;

@Data
public class BaseProperties implements Properties {

    static BasePropertiesConfigurator CONFIGURATOR = new BasePropertiesConfigurator();

    private String apiToken;
    private String basePath;
    private String baseUrl;
    private SettingsBean settings;

    private String configFilePath;

    static class BasePropertiesConfigurator implements PropertiesConfigurator<BaseProperties> {

        private BasePropertiesConfigurator() {

        }

        @Override
        public void populateWithValues(BaseProperties props, Map<String, Object> map) {
            PropertiesBuilder.setEnvOrPropertyIfExists(props::setApiToken, map, API_TOKEN_ENV, API_TOKEN);
            PropertiesBuilder.setEnvOrPropertyIfExists(props::setBasePath, map, BASE_PATH_ENV, BASE_PATH);
            PropertiesBuilder.setEnvOrPropertyIfExists(props::setBaseUrl, map, BASE_URL_ENV, BASE_URL);
            PropertiesBuilder.setPropertyIfExists(props::setConfigFilePath, map, CONFIG_FILE_PATH, String.class);
            props.setSettings(SettingsBean.CONFIGURATOR.buildFromMap(PropertiesBuilder.getMap(map, SETTINGS)));
        }

        @Override
        public void populateWithDefaultValues(BaseProperties props) {
            if (props == null) {
                return;
            }
            String startDir = props.getConfigFilePath() != null ? props.getConfigFilePath() : Paths.get(System.getProperty("user.dir")).toString();
            if (props.getBasePath() != null) {
                Path path;
                try {
                    path = Paths.get(startDir).resolve(props.getBasePath().replaceFirst("^~", System.getProperty("user.home"))).toRealPath();
                } catch (NoSuchFileException e) {
                    path = Paths.get(e.getMessage());
                } catch (IOException e) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.while_checking_base_path"), e);
                }
                props.setBasePath(StringUtils.removeEnd(path.toString(), Utils.PATH_SEPARATOR) + Utils.PATH_SEPARATOR);
            } else {
                props.setBasePath(StringUtils.removeEnd(startDir, Utils.PATH_SEPARATOR) + Utils.PATH_SEPARATOR);
            }

            if (StringUtils.isNotEmpty(props.getBaseUrl())) {
                props.setBaseUrl(StringUtils.removePattern(props.getBaseUrl(), "/(api(/|/v2/?)?)?$"));
            } else {
                props.setBaseUrl(Utils.getBaseUrl());
            }
            if (props.getSettings() == null) {
                props.setSettings(new SettingsBean());
            }
            SettingsBean.CONFIGURATOR.populateWithDefaultValues(props.getSettings());
        }

        @Override
        public PropertiesBuilder.Messages checkProperties(@NonNull BaseProperties props, CheckType checkType) {
            PropertiesBuilder.Messages messages = new PropertiesBuilder.Messages();
            if (props.getApiToken() == null) {
                String confFilePath = props.getConfigFilePath();
                if (confFilePath == null || !(new File(confFilePath).exists())) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.configuration_file_not_exist"));
                }
            }
            if (StringUtils.isEmpty(props.getApiToken())) {
                messages.addError(RESOURCE_BUNDLE.getString("error.config.missed_api_token"));
            }
            if (StringUtils.isEmpty(props.getBaseUrl())) {
                messages.addError(RESOURCE_BUNDLE.getString("error.config.missed_base_url"));
            } else if (!PropertiesBeanUtils.isUrlValid(props.getBaseUrl())) {
                messages.addError(RESOURCE_BUNDLE.getString("error.config.wrong_base_url"));
            }

            if (StringUtils.isNotEmpty(props.getBasePath())) {
                if (!checkBasePathExists(props.getBasePath())) {
                    messages.addError(String.format(RESOURCE_BUNDLE.getString("error.config.base_path_not_exist"), props.getBasePath()));
                } else if (!checkBasePathIsDir(props.getBasePath())) {
                    messages.addError(String.format(RESOURCE_BUNDLE.getString("error.config.base_path_is_not_dir"), props.getBasePath()));
                }
            } else {
                messages.addError(RESOURCE_BUNDLE.getString("error.config.base_path_empty"));
            }
            messages.addAllErrors(SettingsBean.CONFIGURATOR.checkProperties(props.settings));
            return messages;
        }
    }
}
