package com.crowdin.cli.properties;

import com.crowdin.cli.commands.Outputter;
import lombok.NonNull;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

public class PropertiesWithTargetsBuilder extends PropertiesBuilder<PropertiesWithTargets, ParamsWithTargets> {

    public PropertiesWithTargetsBuilder(Outputter outputter) {
        super(outputter);
    }

    @Override
    protected PropertiesWithTargets getEmptyInstance() {
        return new PropertiesWithTargets();
    }

    @Override
    protected void populateWithIdentityFileParams(PropertiesWithTargets props, @NonNull Map<String, Object> identityFileParams) {
        BaseProperties.CONFIGURATOR.populateWithValues(props, identityFileParams);
        IdProperties.CONFIGURATOR.populateWithValues(props, identityFileParams);
    }

    @Override
    protected void populateWithConfigFileParams(PropertiesWithTargets props, @NonNull Map<String, Object> configFileParams) {
        if (configFileParams.isEmpty()) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.empty_properties_file"));
        }
        BaseProperties.CONFIGURATOR.populateWithValues(props, configFileParams);
        IdProperties.CONFIGURATOR.populateWithValues(props, configFileParams);
        PropertiesWithTargets.CONFIGURATOR.populateWithValues(props, configFileParams);
    }

    @Override
    protected Messages checkArgParams(@NonNull ParamsWithTargets params) {
        Messages messages = new Messages();
        if (params == null) {
            return messages;
        }
        if (params.getBaseUrlParam() != null && !checkBaseUrl(params.getBaseUrlParam())) {
            messages.addError(RESOURCE_BUNDLE.getString("error.config.wrong_base_url"));
        }
        if (params.getSkipTranslatedOnly() != null && params.getSkipUntranslatedFiles() != null
            && params.getSkipTranslatedOnly() && params.getSkipUntranslatedFiles()) {
            messages.addError(RESOURCE_BUNDLE.getString("error.skip_untranslated_both_strings_and_files"));
        }
        return messages;
    }

    @Override
    protected void populateWithArgParams(PropertiesWithTargets props, @NonNull ParamsWithTargets params) {
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
        for (TargetBean tb : props.getTargets()) {
            for (TargetBean.FileBean fb : tb.getFiles()) {
                if (params.getSkipTranslatedOnly() != null) {
                    fb.setSkipTranslatedOnly(params.getSkipTranslatedOnly());
                }
                if (params.getSkipUntranslatedFiles() != null) {
                    fb.setSkipUntranslatedFiles(params.getSkipUntranslatedFiles());
                }
                if (params.getExportApprovedOnly() != null) {
                    fb.setExportApprovedOnly(params.getExportApprovedOnly());
                }
            }
        }
    }

    @Override
    protected void populateWithDefaultValues(PropertiesWithTargets props) {
        if (props == null) {
            return;
        }
        BaseProperties.CONFIGURATOR.populateWithDefaultValues(props);
        IdProperties.CONFIGURATOR.populateWithDefaultValues(props);
        PropertiesWithTargets.CONFIGURATOR.populateWithDefaultValues(props);
    }

    @Override
    protected Messages checkProperties(PropertiesWithTargets props) {
        Messages messages = new Messages();
        if (props == null) {
            messages.addError(RESOURCE_BUNDLE.getString("error.config.property_bean_null"));
            return messages;
        }
        messages.populate(BaseProperties.CONFIGURATOR.checkProperties(props, PropertiesConfigurator.CheckType.STANDARD));
        messages.populate(IdProperties.CONFIGURATOR.checkProperties(props, PropertiesConfigurator.CheckType.STANDARD));
        messages.populate(PropertiesWithTargets.CONFIGURATOR.checkProperties(props, PropertiesConfigurator.CheckType.STANDARD));
        return messages;
    }
}
