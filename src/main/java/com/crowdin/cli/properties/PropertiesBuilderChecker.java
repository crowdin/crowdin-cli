package com.crowdin.cli.properties;

import com.crowdin.cli.commands.Outputter;
import lombok.NonNull;

import java.util.Map;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

public class PropertiesBuilderChecker extends PropertiesBuilder<AllProperties, NoParams> {

    public PropertiesBuilderChecker(Outputter out) {
        super(out);
    }

    @Override
    protected AllProperties getEmptyInstance() {
        return new AllProperties();
    }

    @Override
    protected void populateWithIdentityFileParams(AllProperties props, @NonNull Map<String, Object> identityFileParams) {
        BaseProperties.CONFIGURATOR.populateWithValues(props.getProjectProperties(), identityFileParams);
        ProjectProperties.CONFIGURATOR.populateWithValues(props.getProjectProperties(), identityFileParams);

        BaseProperties.CONFIGURATOR.populateWithValues(props.getPropertiesWithFiles(), identityFileParams);
        ProjectProperties.CONFIGURATOR.populateWithValues(props.getPropertiesWithFiles(), identityFileParams);
    }

    @Override
    protected void populateWithConfigFileParams(AllProperties props, @NonNull Map<String, Object> configFileParams) {
        BaseProperties.CONFIGURATOR.populateWithValues(props.getProjectProperties(), configFileParams);
        ProjectProperties.CONFIGURATOR.populateWithValues(props.getProjectProperties(), configFileParams);

        BaseProperties.CONFIGURATOR.populateWithValues(props.getPropertiesWithFiles(), configFileParams);
        ProjectProperties.CONFIGURATOR.populateWithValues(props.getPropertiesWithFiles(), configFileParams);
        PropertiesWithFiles.CONFIGURATOR.populateWithValues(props.getPropertiesWithFiles(), configFileParams);
    }

    @Override
    protected Messages checkArgParams(@NonNull NoParams params) {
        return new Messages();
    }

    @Override
    protected void populateWithArgParams(AllProperties props, @NonNull NoParams params) {

    }

    @Override
    protected void populateWithDefaultValues(AllProperties props) {
        if (props == null) {
            return;
        }
        BaseProperties.CONFIGURATOR.populateWithDefaultValues(props.getProjectProperties());
        ProjectProperties.CONFIGURATOR.populateWithDefaultValues(props.getProjectProperties());

        BaseProperties.CONFIGURATOR.populateWithDefaultValues(props.getPropertiesWithFiles());
        ProjectProperties.CONFIGURATOR.populateWithDefaultValues(props.getPropertiesWithFiles());
        PropertiesWithFiles.CONFIGURATOR.populateWithDefaultValues(props.getPropertiesWithFiles());
    }

    @Override
    protected Messages checkProperties(AllProperties props) {
        Messages messages = new Messages();
        if (props == null) {
            messages.addError(RESOURCE_BUNDLE.getString("error.config.property_bean_null"));
            return messages;
        }
        messages.populate(BaseProperties.CONFIGURATOR.checkProperties(props.getProjectProperties(), PropertiesConfigurator.CheckType.LINT));
        messages.populate(ProjectProperties.CONFIGURATOR.checkProperties(props.getProjectProperties(), PropertiesConfigurator.CheckType.LINT));
        if (!props.getPropertiesWithFiles().getFiles().isEmpty()) {
            messages.populate(PropertiesWithFiles.CONFIGURATOR.checkProperties(
                props.getPropertiesWithFiles(), PropertiesConfigurator.CheckType.LINT));
        }
        return messages;
    }
}
