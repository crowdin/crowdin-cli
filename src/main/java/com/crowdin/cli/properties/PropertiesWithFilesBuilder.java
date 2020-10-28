package com.crowdin.cli.properties;

import com.crowdin.cli.commands.functionality.SourcesUtils;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import lombok.NonNull;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.io.IOException;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

public class PropertiesWithFilesBuilder extends PropertiesBuilder<PropertiesWithFiles, ParamsWithFiles> {

    @Override
    protected PropertiesWithFiles getEmptyInstance() {
        return new PropertiesWithFiles();
    }

    @Override
    protected void populateWithIdentityFileParams(PropertiesWithFiles props, Map<String, Object> identityFileParams) {
        setEnvOrPropertyIfExists(props::setApiToken,    identityFileParams,     API_TOKEN_ENV,  API_TOKEN);
        setEnvOrPropertyIfExists(props::setBasePath,    identityFileParams,     BASE_PATH_ENV,  BASE_PATH);
        setEnvOrPropertyIfExists(props::setBaseUrl,     identityFileParams,     BASE_URL_ENV,   BASE_URL);
        setEnvOrPropertyIfExists(props::setProjectId,   identityFileParams,     PROJECT_ID_ENV,  PROJECT_ID);
    }

    @Override
    protected void populateWithConfigFileParams(PropertiesWithFiles props, @NonNull Map<String, Object> configFileParams) {
        if (configFileParams.isEmpty()) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.empty_properties_file"));
        }

        populateWithIdentityFileParams(props, configFileParams);
        setBooleanPropertyIfExists(props::setPreserveHierarchy, configFileParams, PRESERVE_HIERARCHY);
        props.setFiles(((List<Map<String, Object>>) configFileParams.getOrDefault(FILES, Collections.EMPTY_LIST))
            .stream()
            .map(PropertiesWithFilesBuilder::buildFileBeanFromMap)
            .collect(Collectors.toList()));
        props.setPseudoLocalization(PseudoLocalization.buildFromMap((Map<String, Object>) configFileParams.getOrDefault(PSEUDO_LOCALIZATION, Collections.EMPTY_MAP)));
    }

    private static FileBean buildFileBeanFromMap(Map<String, Object> fbProperties) {
        FileBean fileBean = new FileBean();
        setPropertyIfExists(fileBean::setSource,                    fbProperties, SOURCE);
        setPropertyIfExists(fileBean::setDest,                      fbProperties, DEST);
        setPropertyIfExists(fileBean::setType,                      fbProperties, TYPE);
        setPropertyIfExists(fileBean::setTranslation,               fbProperties, TRANSLATION);
        setPropertyIfExists(fileBean::setUpdateOption,              fbProperties, UPDATE_OPTION);
        setPropertyIfExists(fileBean::setScheme,                    fbProperties, SCHEME);
        setPropertyIfExists(fileBean::setIgnore,                    fbProperties, IGNORE);
        setPropertyIfExists(fileBean::setTranslatableElements,      fbProperties, TRANSLATABLE_ELEMENTS);
        setPropertyIfExists(fileBean::setLanguagesMapping,          fbProperties, LANGUAGES_MAPPING);
        setPropertyIfExists(fileBean::setTranslationReplace,        fbProperties, TRANSLATION_REPLACE);
        setPropertyIfExists(fileBean::setEscapeQuotes,              fbProperties, ESCAPE_QUOTES);
        setPropertyIfExists(fileBean::setEscapeSpecialCharacters,   fbProperties, ESCAPE_SPECIAL_CHARACTERS);
        setBooleanPropertyIfExists(fileBean::setFirstLineContainsHeader,   fbProperties, FIRST_LINE_CONTAINS_HEADER);
        setBooleanPropertyIfExists(fileBean::setTranslateAttributes,       fbProperties, TRANSLATE_ATTRIBUTES);
        setBooleanPropertyIfExists(fileBean::setTranslateContent,          fbProperties, TRANSLATE_CONTENT);
        setBooleanPropertyIfExists(fileBean::setContentSegmentation,       fbProperties, CONTENT_SEGMENTATION);
        setBooleanPropertyIfExists(fileBean::setMultilingualSpreadsheet,   fbProperties, MULTILINGUAL_SPREADSHEET);
        return fileBean;
    }

    @Override
    protected List<String> checkArgParams(ParamsWithFiles params) {
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
        if (params.getSourceParam() != null && params.getTranslationParam() != null) {
            if (!checkForDoubleAsterisks(params.getSourceParam(), params.getTranslationParam())) {
                errors.add(RESOURCE_BUNDLE.getString("error.config.double_asterisk"));
            }
            if (!PlaceholderUtil.containsLangPlaceholders(params.getTranslationParam())) {
                errors.add(RESOURCE_BUNDLE.getString("error.config.translation_has_no_language_placeholders"));
            }
        } else if (params.getSourceParam() != null ^ params.getTranslationParam() != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.params_xor_source_translation"));
        }
        return errors;
    }

    @Override
    protected void populateWithArgParams(@NonNull PropertiesWithFiles props, @NonNull ParamsWithFiles params) {
        if (params.getSourceParam() != null && params.getTranslationParam() != null && new File(params.getSourceParam()).isAbsolute()) {
            props.setPreserveHierarchy(false);

            Path root = Paths.get(System.getProperty("user.dir")).getRoot();
            props.setBasePath((root != null) ? root.toString() : "/");
            params.setSourceParam(StringUtils.removePattern(params.getSourceParam(), "^([a-zA-Z]:)?[\\\\/]+"));
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
        if (params.getSourceParam() != null && params.getTranslationParam() != null) {
            props.setPreserveHierarchy(false);
            FileBean fb = new FileBean();
            if (params.getSourceParam() != null) {
                fb.setSource(StringUtils.removePattern(params.getSourceParam(), "^([a-zA-Z]:)?[\\\\/]+"));
            }
            if (params.getTranslationParam() != null) {
                fb.setTranslation(params.getTranslationParam());
            }
            props.setFiles(Arrays.asList(fb));
        }
    }

    @Override
    protected void populateWithDefaultValues(PropertiesWithFiles props) {
        if (props == null) {
            return;
        }
        props.setPreserveHierarchy(props.getPreserveHierarchy() != null ? props.getPreserveHierarchy() : Boolean.FALSE);

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

        if (props.getFiles() == null) {
            return;
        }
        for (FileBean file : props.getFiles()) {
            //Source
            if (file.getSource() != null) {
                file.setSource(file.getSource().replaceAll("[/\\\\]+", Utils.PATH_SEPARATOR_REGEX));
            }
            //Translation
            if (file.getTranslation() != null) {
                file.setTranslation(file.getTranslation().replaceAll("[/\\\\]+", Utils.PATH_SEPARATOR_REGEX));
                if (!file.getTranslation().startsWith(Utils.PATH_SEPARATOR)) {
                    file.setTranslation(Utils.PATH_SEPARATOR + file.getTranslation());
                }
                if (!PlaceholderUtil.containsLangPlaceholders(file.getTranslation()) && file.getScheme() != null) {
                    file.setTranslation(StringUtils.removeStart(file.getTranslation(), Utils.PATH_SEPARATOR));
                }
            }


            //Ignore
            if (file.getIgnore() != null && !file.getIgnore().isEmpty()) {
                List<String> ignores = new ArrayList<>();
                for (String ignore : file.getIgnore()) {
                    ignores.add(ignore.replaceAll("[/\\\\]+", Utils.PATH_SEPARATOR_REGEX));
                }
                file.setIgnore(ignores);
            }
            //dest
            if (StringUtils.isNotEmpty(file.getDest())) {
                file.setDest(file.getDest().replaceAll("[/\\\\]+", Utils.PATH_SEPARATOR_REGEX));
            }
            //Translate attributes
            if (file.getTranslateAttributes() == null) {
                file.setTranslateAttributes(Boolean.FALSE);
            }
            //Translate content
            file.setTranslateContent(file.getTranslateContent() != null ? file.getTranslateContent() : Boolean.TRUE);
            //Content segmentation
            file.setContentSegmentation(file.getContentSegmentation() != null ? file.getContentSegmentation() : Boolean.TRUE);
            //escape quotes
            if (file.getEscapeQuotes() == null) {
                file.setEscapeQuotes(3);
            }
            //first line contain header
            if (file.getFirstLineContainsHeader() == null) {
                file.setFirstLineContainsHeader(Boolean.FALSE);
            }
        }
    }

    @Override
    protected List<String> checkProperties(PropertiesWithFiles props) {
        List<String> errors = new ArrayList<>();
        if (props == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.property_bean_null"));
            return errors;
        }
        if (StringUtils.isEmpty(props.getProjectId())) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.missed_project_id"));
        } else if (!StringUtils.isNumeric(props.getProjectId())) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.project_id_is_not_number"));
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

        if (props.getFiles() == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.missed_section_files"));
        } else if (props.getFiles().isEmpty()) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.empty_section_file"));
        } else {
            for (FileBean fileBean : props.getFiles()) {
                if (StringUtils.isEmpty(fileBean.getSource())) {
                    errors.add(RESOURCE_BUNDLE.getString("error.config.empty_source_section"));
                }
                if (StringUtils.isEmpty(fileBean.getTranslation())) {
                    errors.add(RESOURCE_BUNDLE.getString("error.config.empty_translation_section"));
                } else {
                    if (!checkForDoubleAsterisks(fileBean.getSource(), fileBean.getTranslation())) {
                        errors.add(RESOURCE_BUNDLE.getString("error.config.double_asterisk"));
                    }
                    if (!PlaceholderUtil.containsLangPlaceholders(fileBean.getTranslation()) && fileBean.getScheme() == null) {
                        errors.add(RESOURCE_BUNDLE.getString("error.config.translation_has_no_language_placeholders"));
                    }
                    if (hasRelativePaths(fileBean.getTranslation())) {
                        errors.add(RESOURCE_BUNDLE.getString("error.config.translation_contains_relative_paths"));
                    }
                }

                String updateOption = fileBean.getUpdateOption();
                if (updateOption != null && !(updateOption.equals("update_as_unapproved") || updateOption.equals("update_without_changes"))) {
                    errors.add(RESOURCE_BUNDLE.getString("error.config.update_option"));
                }
                Integer escQuotes = fileBean.getEscapeQuotes();
                if (escQuotes != null && (escQuotes < 0 || escQuotes > 3)) {
                    errors.add(RESOURCE_BUNDLE.getString("error.config.escape_quotes"));
                }
                Integer escSpecialCharacters = fileBean.getEscapeSpecialCharacters();
                if (escSpecialCharacters != null && (escSpecialCharacters < 0 || escSpecialCharacters > 1)) {
                    errors.add(RESOURCE_BUNDLE.getString("error.config.escape_special_characters"));
                }

                if (StringUtils.isNotEmpty(fileBean.getDest()) && SourcesUtils.containsPattern(fileBean.getSource())) {
                    errors.add(RESOURCE_BUNDLE.getString("error.dest_and_pattern_in_source"));
                } else if (StringUtils.isNotEmpty(fileBean.getDest()) && !props.getPreserveHierarchy()) {
                    errors.add(RESOURCE_BUNDLE.getString("error.dest_and_preserve_hierarchy"));
                }
            }
        }
        if (props.getPseudoLocalization() != null) {
            PseudoLocalization pl = props.getPseudoLocalization();
            if (pl.getLengthCorrection() != null) {
                if (pl.getLengthCorrection() < -51 || pl.getLengthCorrection() > 100) {
                    errors.add("Acceptable values for 'length_correction' must be from -50 to 100");
                }
            }
        }
        return errors;
    }
}
