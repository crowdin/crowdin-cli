package com.crowdin.cli.properties;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import lombok.NonNull;

import java.util.Map;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

public class ProjectPropertiesBuilder extends PropertiesBuilder<ProjectProperties, ProjectParams> {

    public ProjectPropertiesBuilder(Outputter outputter) {
        super(outputter);
    }

    @Override
    protected ProjectProperties getEmptyInstance() {
        return new ProjectProperties();
    }

    @Override
    protected void populateWithIdentityFileParams(ProjectProperties props, @NonNull Map<String, Object> identityFileParams) {
        BaseProperties.CONFIGURATOR.populateWithValues(props, identityFileParams);
        ProjectProperties.CONFIGURATOR.populateWithValues(props, identityFileParams);
    }

    @Override
    protected void populateWithConfigFileParams(ProjectProperties props, @NonNull Map<String, Object> configFileParams) {
        if (configFileParams.isEmpty()) {
            throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.empty_properties_file"));
        }
        BaseProperties.CONFIGURATOR.populateWithValues(props, configFileParams);
        ProjectProperties.CONFIGURATOR.populateWithValues(props, configFileParams);
    }

    @Override
    protected PropertiesBuilder.Messages checkArgParams(@NonNull ProjectParams params) {
        PropertiesBuilder.Messages messages = new PropertiesBuilder.Messages();
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
    protected void populateWithArgParams(ProjectProperties props, @NonNull ProjectParams params) {
        if (params.getIdParam() != null) {
            props.setProjectId(params.getIdParam());
        }
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
    protected void populateWithDefaultValues(ProjectProperties props) {
        if (props == null) {
            return;
        }
        BaseProperties.CONFIGURATOR.populateWithDefaultValues(props);
        ProjectProperties.CONFIGURATOR.populateWithDefaultValues(props);
    }

    @Override
    protected PropertiesBuilder.Messages checkProperties(ProjectProperties props) {
        PropertiesBuilder.Messages messages = new PropertiesBuilder.Messages();
        if (props == null) {
            messages.addError(RESOURCE_BUNDLE.getString("error.config.property_bean_null"));
            return messages;
        }
        messages.populate(BaseProperties.CONFIGURATOR.checkProperties(props, PropertiesConfigurator.CheckType.STANDARD));
        messages.populate(ProjectProperties.CONFIGURATOR.checkProperties(props, PropertiesConfigurator.CheckType.STANDARD));
        return messages;
    }
}
