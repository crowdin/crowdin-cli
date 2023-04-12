package com.crowdin.cli.properties;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.utils.PlaceholderUtil;
import lombok.NonNull;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

public class PropertiesWithFilesBuilder extends PropertiesBuilder<PropertiesWithFiles, ParamsWithFiles> {

    public PropertiesWithFilesBuilder(Outputter outputter) {
        super(outputter);
    }

    @Override
    protected PropertiesWithFiles getEmptyInstance() {
        return new PropertiesWithFiles();
    }

    @Override
    protected void populateWithIdentityFileParams(PropertiesWithFiles props, Map<String, Object> identityFileParams) {
        BaseProperties.CONFIGURATOR.populateWithValues(props, identityFileParams);
        ProjectProperties.CONFIGURATOR.populateWithValues(props, identityFileParams);
    }

    @Override
    protected void populateWithConfigFileParams(PropertiesWithFiles props, @NonNull Map<String, Object> configFileParams) {
        if (configFileParams.isEmpty()) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.empty_properties_file"));
        }
        BaseProperties.CONFIGURATOR.populateWithValues(props, configFileParams);
        ProjectProperties.CONFIGURATOR.populateWithValues(props, configFileParams);
        PropertiesWithFiles.CONFIGURATOR.populateWithValues(props, configFileParams);
    }

    @Override
    protected Messages checkArgParams(ParamsWithFiles params) {
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
        if (params.getSourceParam() != null && params.getTranslationParam() != null) {
            if (!checkForDoubleAsterisks(params.getSourceParam(), params.getTranslationParam())) {
                messages.addError(RESOURCE_BUNDLE.getString("error.config.double_asterisk"));
            }
            if (!PlaceholderUtil.containsLangPlaceholders(params.getTranslationParam())) {
                messages.addError(RESOURCE_BUNDLE.getString("error.config.translation_has_no_language_placeholders"));
            }
        } else {
            if (params.getSourceParam() != null ^ params.getTranslationParam() != null) {
                messages.addError(RESOURCE_BUNDLE.getString("error.config.params_xor_source_translation"));
            }
            if (params.getDestParam() != null) {
                messages.addError(RESOURCE_BUNDLE.getString("error.config.params_dest"));
            }
        }
        if (params.getSkipTranslatedOnly() != null && params.getSkipUntranslatedFiles() != null
            && params.getSkipTranslatedOnly() && params.getSkipUntranslatedFiles()) {
            messages.addError(RESOURCE_BUNDLE.getString("error.skip_untranslated_both_strings_and_files"));
        }
        return messages;
    }

    @Override
    protected void populateWithArgParams(@NonNull PropertiesWithFiles props, @NonNull ParamsWithFiles params) {
        if (params.getSourceParam() != null && params.getTranslationParam() != null && new File(params.getSourceParam()).isAbsolute()) {
            props.setPreserveHierarchy(false);

            Path root = Paths.get(System.getProperty("user.dir")).getRoot();
            String rootPath = root != null ? root.toString() : "/";
            if(props.getBasePath() == null) {
                props.setBasePath(rootPath);
            }
            params.setSourceParam(StringUtils.removePattern(params.getSourceParam(), "^\\?([a-zA-Z]:)?[\\\\/]+"));
        }
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
        props.setPreserveHierarchy(params.getPreserveHierarchy() != null ? params.getPreserveHierarchy()
                : props.getPreserveHierarchy());

        if (params.getSourceParam() != null && params.getTranslationParam() != null) {
            FileBean fb = new FileBean();
            if (params.getSourceParam() != null) {
                fb.setSource(StringUtils.removePattern(params.getSourceParam(), "^\\?([a-zA-Z]:)?[\\\\/]+"));
            }
            if (params.getTranslationParam() != null) {
                fb.setTranslation(params.getTranslationParam());
            }
            if (params.getDestParam() != null) {
                props.setPreserveHierarchy(true);
                fb.setDest(params.getDestParam());
            }
            props.setFiles(Arrays.asList(fb));
        }
        for (FileBean fb : props.getFiles()) {
            if (params.getSkipTranslatedOnly() != null) {
                fb.setSkipTranslatedOnly(params.getSkipTranslatedOnly());
            }
            if (params.getSkipUntranslatedFiles() != null) {
                fb.setSkipUntranslatedFiles(params.getSkipUntranslatedFiles());
            }
            if (params.getExportApprovedOnly() != null) {
                fb.setExportApprovedOnly(params.getExportApprovedOnly());
            }
            if (params.getLabels() != null) {
                Set<String> labels = (fb.getLabels() != null) ? new HashSet<>(fb.getLabels()) : new HashSet<>();
                labels.addAll(params.getLabels());
                fb.setLabels(new ArrayList<>(labels));
            }
            if (params.getExcludedTargetLanguages() != null && !params.getExcludedTargetLanguages().isEmpty()) {
                if (fb.getExcludedTargetLanguages() == null) {
                    fb.setExcludedTargetLanguages(new ArrayList<>());
                }
                for (String lang : params.getExcludedTargetLanguages()) {
                    if (!fb.getExcludedTargetLanguages().contains(lang)) {
                        fb.getExcludedTargetLanguages().add(lang);
                    }
                }
            }
        }
    }

    @Override
    protected void populateWithDefaultValues(PropertiesWithFiles props) {
        if (props == null) {
            return;
        }
        BaseProperties.CONFIGURATOR.populateWithDefaultValues(props);
        ProjectProperties.CONFIGURATOR.populateWithDefaultValues(props);
        PropertiesWithFiles.CONFIGURATOR.populateWithDefaultValues(props);
    }

    @Override
    protected Messages checkProperties(PropertiesWithFiles props) {
        Messages messages = new Messages();
        if (props == null) {
            messages.addError(RESOURCE_BUNDLE.getString("error.config.property_bean_null"));
            return messages;
        }
        messages.populate(BaseProperties.CONFIGURATOR.checkProperties(props, PropertiesConfigurator.CheckType.STANDARD));
        messages.populate(ProjectProperties.CONFIGURATOR.checkProperties(props, PropertiesConfigurator.CheckType.STANDARD));
        messages.populate(PropertiesWithFiles.CONFIGURATOR.checkProperties(props, PropertiesConfigurator.CheckType.STANDARD));
        return messages;
    }
}
