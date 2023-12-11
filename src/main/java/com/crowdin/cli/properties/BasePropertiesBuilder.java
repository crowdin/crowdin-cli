package com.crowdin.cli.properties;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import lombok.NonNull;

import java.util.Map;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

public class BasePropertiesBuilder extends PropertiesBuilder<BaseProperties, BaseParams> {

    public BasePropertiesBuilder(Outputter outputter) {
        super(outputter);
    }

    @Override
    protected BaseProperties getEmptyInstance() {
        return new BaseProperties();
    }

    @Override
    protected void populateWithIdentityFileParams(BaseProperties props, @NonNull Map<String, Object> identityFileParams) {
        BaseProperties.CONFIGURATOR.populateWithValues(props, identityFileParams);
    }

    @Override
    protected void populateWithConfigFileParams(BaseProperties props, @NonNull Map<String, Object> configFileParams) {
        if (configFileParams.isEmpty()) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.empty_properties_file"));
        }
        BaseProperties.CONFIGURATOR.populateWithValues(props, configFileParams);
    }

    @Override
    protected Messages checkArgParams(@NonNull BaseParams params) {
        Messages messages = new Messages();
        if (params == null) {
            return messages;
        }
        if (params.getBaseUrlParam() != null && !PropertiesBeanUtils.isUrlValid(params.getBaseUrlParam())) {
            messages.addError(RESOURCE_BUNDLE.getString("error.config.wrong_base_url"));
        }
        if (params.getBasePathParam() != null) {
            if (!checkBasePathExists(params.getBasePathParam())) {
                messages.addError(String.format(RESOURCE_BUNDLE.getString("error.config.base_path_not_exist"), params.getBasePathParam()));
            } else if (!checkBasePathIsDir(params.getBasePathParam())) {
                messages.addError(String.format(RESOURCE_BUNDLE.getString("error.config.base_path_is_not_dir"), params.getBasePathParam()));
            }
        }
        return messages;
    }

    @Override
    protected void populateWithArgParams(BaseProperties props, @NonNull BaseParams params) {
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
        BaseProperties.CONFIGURATOR.populateWithDefaultValues(props);
    }

    @Override
    protected Messages checkProperties(BaseProperties props) {
        Messages messages = new Messages();
        if (props == null) {
            messages.addError(RESOURCE_BUNDLE.getString("error.config.property_bean_null"));
            return messages;
        }
        messages.populate(BaseProperties.CONFIGURATOR.checkProperties(props, PropertiesConfigurator.CheckType.STANDARD));
        return messages;
    }
}
