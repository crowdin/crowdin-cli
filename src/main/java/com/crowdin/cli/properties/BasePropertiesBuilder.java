package com.crowdin.cli.properties;

import com.crowdin.cli.utils.Utils;
import lombok.NonNull;
import org.apache.commons.lang3.StringUtils;

import java.io.IOException;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

public class BasePropertiesBuilder extends PropertiesBuilder<BaseProperties, Params> {

    @Override
    protected BaseProperties getEmptyInstance() {
        return new BaseProperties();
    }

    @Override
    protected void populateWithIdentityFileParams(BaseProperties props, @NonNull Map<String, Object> identityFileParams) {
        setEnvOrPropertyIfExists(props::setApiToken,    identityFileParams,     API_TOKEN_ENV,  API_TOKEN);
        setEnvOrPropertyIfExists(props::setBasePath,    identityFileParams,     BASE_PATH_ENV,  BASE_PATH);
        setEnvOrPropertyIfExists(props::setBaseUrl,     identityFileParams,     BASE_URL_ENV,   BASE_URL);
    }

    @Override
    protected void populateWithConfigFileParams(BaseProperties props, @NonNull Map<String, Object> configFileParams) {
        if (configFileParams.isEmpty()) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.empty_properties_file"));
        }

        populateWithIdentityFileParams(props, configFileParams);
    }

    @Override
    protected List<String> checkArgParams(@NonNull Params params) {
        List<String> errors = new ArrayList<>();
        if (params == null) {
            return errors;
        }
        if (params.getBaseUrlParam() != null && !checkBaseUrl(params.getBaseUrlParam())) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.wrong_base_url"));
        }
        if (params.getBasePathParam() != null) {
            if (!checkBasePathExists(params.getBasePathParam())) {
                errors.add(String.format(RESOURCE_BUNDLE.getString("error.config.base_path_not_exist"), params.getBasePathParam()));
            } else if (!checkBasePathIsDir(params.getBasePathParam())) {
                errors.add(String.format(RESOURCE_BUNDLE.getString("error.config.base_path_is_not_dir"), params.getBasePathParam()));
            }
        }
        return errors;
    }

    @Override
    protected void populateWithArgParams(BaseProperties props, @NonNull Params params) {
        if (params.getTokenParam() != null) {
            props.setApiToken(params.getTokenParam());
        }
        if (params.getBasePathParam() != null) {
            props.setBasePath(params.getBasePathParam());
        }
        if (params.getBaseUrlParam() != null) {
            props.setBaseUrl(params.getBaseUrlParam());
        }
    }

    @Override
    protected void populateWithDefaultValues(BaseProperties props) {
        if (props == null) {
            return;
        }
        String userDir = Paths.get(System.getProperty("user.dir")).toString();
        if (props.getBasePath() != null) {
            Path path;
            try {
                path = Paths.get(userDir).resolve(props.getBasePath().replaceFirst("^~", System.getProperty("user.home"))).toRealPath();
            } catch (NoSuchFileException e) {
                path = Paths.get(e.getMessage());
            } catch (IOException e) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.while_checking_base_path"), e);
            }
            props.setBasePath(StringUtils.removeEnd(path.toString(), Utils.PATH_SEPARATOR) + Utils.PATH_SEPARATOR);
        } else {
            props.setBasePath(StringUtils.removeEnd(userDir, Utils.PATH_SEPARATOR) + Utils.PATH_SEPARATOR);
        }

        if (StringUtils.isNotEmpty(props.getBaseUrl())) {
            props.setBaseUrl(StringUtils.removePattern(props.getBaseUrl(), "/(api(/|/v2/?)?)?$"));
        } else {
            props.setBaseUrl(Utils.getBaseUrl());
        }
    }

    @Override
    protected List<String> checkProperties(BaseProperties props) {
        List<String> errors = new ArrayList<>();
        if (props == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.property_bean_null"));
            return errors;
        }
        if (StringUtils.isEmpty(props.getApiToken())) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.missed_api_token"));
        }
        if (StringUtils.isEmpty(props.getBaseUrl())) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.missed_base_url"));
        } else if (!checkBaseUrl(props.getBaseUrl())) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.wrong_base_url"));
        }

        if (StringUtils.isNotEmpty(props.getBasePath())) {
            if (!checkBasePathExists(props.getBasePath())) {
                errors.add(String.format(RESOURCE_BUNDLE.getString("error.config.base_path_not_exist"), props.getBasePath()));
            } else if (!checkBasePathIsDir(props.getBasePath())) {
                errors.add(String.format(RESOURCE_BUNDLE.getString("error.config.base_path_is_not_dir"), props.getBasePath()));
            }
        } else {
            errors.add(RESOURCE_BUNDLE.getString("error.config.base_path_empty"));
        }
        return errors;
    }
}
