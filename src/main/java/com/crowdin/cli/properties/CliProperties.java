package com.crowdin.cli.properties;

import com.crowdin.cli.utils.MessageSource;
import com.crowdin.cli.utils.Utils;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.function.Consumer;
import java.util.stream.Collectors;


public class CliProperties {

    private static final ResourceBundle RESOURCE_BUNDLE = MessageSource.RESOURCE_BUNDLE;

    public static final String PROJECT_ID = "project_id";

    private static final String PROJECT_ID_ENV = "project_id_env";

    public static final String API_TOKEN = "api_token";

    private static final String API_TOKEN_ENV = "api_token_env";

    private static final String LOGIN = "login";

    private static final String LOGIN_ENV = "login_env";

    public static final String BASE_PATH = "base_path";

    private static final String BASE_PATH_ENV = "base_path_env";

    public static final String BASE_URL = "base_url";

    private static final String BASE_URL_ENV = "base_url_env";

    private static final String PRESERVE_HIERARCHY = "preserve_hierarchy";

    private static final String FILES = "files";

    private static final String SOURCE = "source";

    private static final String IGNORE = "ignore";

    private static final String DEST = "dest";

    private static final String TYPE = "type";

    private static final String TRANSLATION = "translation";

    private static final String UPDATE_OPTION = "update_option";

    private static final String LANGUAGES_MAPPING = "languages_mapping";

    private static final String FIRST_LINE_CONTAINS_HEADER = "first_line_contains_header";

    private static final String TRANSLATE_ATTRIBUTES = "translate_attributes";

    private static final String TRANSLATE_CONTENT = "translate_content";

    private static final String TRANSLATABLE_ELEMENTS = "translatable_elements";

    private static final String CONTENT_SEGMENTATION = "content_segmentation";

    private static final String ESCAPE_QUOTES = "escape_quotes";

    private static final String ESCAPE_SPECIAL_CHARACTERS = "escape_special_characters";

    private static final String MULTILINGUAL_SPREADSHEET = "multilingual_spreadsheet";

    private static final String SCHEME = "scheme";

    private static final String TRANSLATION_REPLACE = "translation_replace";

    public static PropertiesBean processProperties(PropertiesBean pb, String basePathIfEmpty) {
        setDefaultValues(pb, basePathIfEmpty);

        List<String> errors = checkProperties(pb);
        if (!errors.isEmpty()) {
            String errorsInOne = errors.stream()
                .map(error -> String.format(RESOURCE_BUNDLE.getString("message.item_list"), error))
                .collect(Collectors.joining("\n"));
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.configuration_file_is_invalid")+"\n" + errorsInOne);
        }

        return pb;
    }

    public static PropertiesBean buildFromMap(Map<String, Object> properties) {
        if (properties == null) {
            throw new NullPointerException("CliProperties.loadProperties has null args");
        }
        if (properties.isEmpty()) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.empty_properties_file"));
        }
        PropertiesBean pb = new PropertiesBean();

        populateWithCredentials(pb, properties);
        getBooleanProperty(pb::setPreserveHierarchy, properties, PRESERVE_HIERARCHY);
        ((List<Map<String, Object>>) properties.getOrDefault(FILES, Collections.EMPTY_LIST))
            .stream()
            .map(CliProperties::buildFileBeanFromMap)
            .forEach(pb::setFiles);
        return pb;
    }

    private static FileBean buildFileBeanFromMap(Map<String, Object> fbProperties) {
        FileBean fileBean = new FileBean();
        getProperty(        fileBean::setSource,                    fbProperties, SOURCE);
        getProperty(        fileBean::setDest,                      fbProperties, DEST);
        getProperty(        fileBean::setType,                      fbProperties, TYPE);
        getProperty(        fileBean::setTranslation,               fbProperties, TRANSLATION);
        getProperty(        fileBean::setUpdateOption,              fbProperties, UPDATE_OPTION);
        getProperty(        fileBean::setScheme,                    fbProperties, SCHEME);
        getProperty(        fileBean::setIgnore,                    fbProperties, IGNORE);
        getProperty(        fileBean::setTranslatableElements,      fbProperties, TRANSLATABLE_ELEMENTS);
        getProperty(        fileBean::setLanguagesMapping,          fbProperties, LANGUAGES_MAPPING);
        getProperty(        fileBean::setTranslationReplace,        fbProperties, TRANSLATION_REPLACE);
        getProperty(        fileBean::setEscapeQuotes,              fbProperties, ESCAPE_QUOTES);
        getProperty(        fileBean::setEscapeSpecialCharacters,   fbProperties, ESCAPE_SPECIAL_CHARACTERS);
        getBooleanProperty( fileBean::setFirstLineContainsHeader,   fbProperties, FIRST_LINE_CONTAINS_HEADER);
        getBooleanProperty( fileBean::setTranslateAttributes,       fbProperties, TRANSLATE_ATTRIBUTES);
        getBooleanProperty( fileBean::setTranslateContent,          fbProperties, TRANSLATE_CONTENT);
        getBooleanProperty( fileBean::setContentSegmentation,       fbProperties, CONTENT_SEGMENTATION);
        getBooleanProperty( fileBean::setMultilingualSpreadsheet,   fbProperties, MULTILINGUAL_SPREADSHEET);
        return fileBean;
    }

    public static void populateWithCredentials(PropertiesBean pb, Map<String, Object> properties) {
        getCredentialProperty(pb::setApiToken,    properties,     API_TOKEN_ENV,  API_TOKEN);
        getCredentialProperty(pb::setBasePath,    properties,     BASE_PATH_ENV,  BASE_PATH);
        getCredentialProperty(pb::setBaseUrl,     properties,     BASE_URL_ENV,   BASE_URL);
        getCredentialProperty(pb::setProjectId,   properties,     PROJECT_ID_ENV,  PROJECT_ID);
    }

    private static void getCredentialProperty(Consumer<String> setter, Map<String, Object> properties, String envKey, String key) {
        String param = properties.containsKey(envKey)
            ? System.getenv(properties.get(envKey).toString())
            : (properties.containsKey(key))
                ? properties.get(key).toString()
                : null;
        if (param != null) {
            setter.accept(param);
        }
    }

    private static void getBooleanProperty(Consumer<Boolean> setter, Map<String, Object> properties, String key) {
        Boolean param = properties.containsKey(key)
            ? properties.get(key).toString().equals("1")
                ? Boolean.TRUE
                : Boolean.valueOf(properties.get(key).toString())
            : null;
        if (param != null) {
            setter.accept(param);
        }
    }

    private static <T> void getProperty(Consumer<T> setter, Map<String, Object> properties, String key) {
        try {
            T param = (T) properties.getOrDefault(key, null);
            if (param != null) {
                setter.accept(param);
            }
        } catch (ClassCastException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.cast_param"), key), e);
        }
    }

    public static void populateWithParams(PropertiesBean pb, Params params) {
        if (params.getIdParam() != null) {
            pb.setProjectId(params.getIdParam());
        }
        if (params.getTokenParam() != null) {
            pb.setApiToken(params.getTokenParam());
        }
        if (params.getBasePathParam() != null) {
            pb.setBasePath(params.getBasePathParam());
        }
        if (params.getBaseUrlParam() != null) {
            pb.setBaseUrl(params.getBaseUrlParam());
        }
        if (params.getSourceParam() != null && params.getTranslationParam() != null) {
            FileBean fb = new FileBean();
            if (params.getSourceParam() != null) {
                fb.setSource(params.getSourceParam());
            }
            if (params.getTranslationParam() != null) {
                fb.setTranslation(params.getTranslationParam());
            }
            pb.getFiles().clear();
            pb.setFiles(fb);
        }
    }

    private static void setDefaultValues(PropertiesBean pb, String basePathIfEmpty) {
        if (pb == null) {
            return;
        }
        pb.setPreserveHierarchy(pb.getPreserveHierarchy() != null ? pb.getPreserveHierarchy() : Boolean.FALSE);

        if (pb.getBasePath() != null) {
            Path path;
            try {
                path = Paths.get(pb.getBasePath()).toRealPath();
            } catch (NoSuchFileException e) {
                path = Paths.get(e.getMessage());
            } catch (IOException e) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.while_checking_base_path"), e);
            }
            pb.setBasePath(path.toString());
        } else {
            pb.setBasePath(basePathIfEmpty);
        }

        if (StringUtils.isNotEmpty(pb.getBaseUrl())) {
            pb.setBaseUrl(StringUtils.removePattern(pb.getBaseUrl(), "/(api(/|/v2/?)?)?$") + "/api/v2");
        } else {
            pb.setBaseUrl(Utils.getBaseUrl());
        }

        if (pb.getFiles() == null) {
            return;
        }
        for (FileBean file : pb.getFiles()) {
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
                if (!containsLangPlaceholders(file.getTranslation()) && file.getScheme() != null) {
                    file.setTranslation(StringUtils.removeStart(file.getTranslation(), Utils.PATH_SEPARATOR));
                }
            }


            //Ignore
            if (file.getIgnore() == null || file.getIgnore().isEmpty()) {
            } else {
                List<String> ignores = new ArrayList<>();
                for (String ignore : file.getIgnore()) {
                    ignores.add(ignore.replaceAll("[/\\\\]+", Utils.PATH_SEPARATOR_REGEX));
                }
                file.setIgnore(ignores);
            }
            //dest
            if (StringUtils.isEmpty(file.getDest())) {
            } else {
                file.setDest(file.getDest().replaceAll("[/\\\\]+", Utils.PATH_SEPARATOR_REGEX));
            }
            //Type
            if (StringUtils.isEmpty(file.getType())) {
            } else {
            }
            //Update option
            if (StringUtils.isEmpty(file.getUpdateOption())) {
            } else {
            }
            //Translate attributes
            if (file.getTranslateAttributes() == null) {
            } else {
            }
            //Translate content
            file.setTranslateContent(file.getTranslateContent() != null ? file.getTranslateContent() : Boolean.TRUE);
            //Translatable elements
            if (file.getTranslatableElements() == null || file.getTranslatableElements().isEmpty()) {
            } else {
            }
            //Content segmentation
            file.setContentSegmentation(file.getContentSegmentation() != null ? file.getContentSegmentation() : Boolean.TRUE);
            //escape quotes
            if (file.getEscapeQuotes() != null) {
            }
            //Language mapping
            if (file.getLanguagesMapping() == null || file.getLanguagesMapping().isEmpty()) {
            } else {
            }
            //Multilingual spreadsheet
            if (file.getMultilingualSpreadsheet() == null) {
            }
            //first line contain header
            if (file.getFirstLineContainsHeader() == null) {
            } else {
            }
            //scheme
            if (StringUtils.isEmpty(file.getScheme())) {
            } else {
            }
            //translation repalce
            if (file.getTranslationReplace() == null || file.getTranslationReplace().isEmpty()) {
            } else {
            }
        }
    }

    private static List<String> checkProperties(PropertiesBean pb) {
        List<String> errors = new ArrayList<>();
        if (pb == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.property_bean_null"));
            return errors;
        }
        if (StringUtils.isEmpty(pb.getProjectId())) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.missed_project_id"));
        }
        if (StringUtils.isEmpty(pb.getApiToken())) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.missed_api_token"));
        }
        if (StringUtils.isEmpty(pb.getBaseUrl())) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.missed_base_url"));
        } else if (!pb.getBaseUrl().matches("(https://(.+\\.)?|http://(.+\\.)?.+\\.dev\\.)crowdin\\.com/api/v2")) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.wrong_base_url"));
        }

        if (StringUtils.isNotEmpty(pb.getBasePath())) {
            if (!Files.exists(Paths.get(pb.getBasePath()))) {
                errors.add(String.format(RESOURCE_BUNDLE.getString("error.config.base_path_not_exist"), pb.getBasePath()));
            } else if (!Files.isDirectory(Paths.get(pb.getBasePath()))) {
                errors.add(String.format(RESOURCE_BUNDLE.getString("error.config.base_path_is_not_dir"), pb.getBasePath()));
            }
        } else {
            errors.add(RESOURCE_BUNDLE.getString("error.config.base_path_empty"));
        }

        if (pb.getFiles() == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.missed_section_files"));
        } else if (pb.getFiles().isEmpty()) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.empty_section_file"));
        } else {
            for (FileBean fileBean : pb.getFiles()) {
                if (StringUtils.isEmpty(fileBean.getSource())) {
                    errors.add(RESOURCE_BUNDLE.getString("error.config.empty_source_section"));
                }
                if (StringUtils.isEmpty(fileBean.getTranslation())) {
                    errors.add(RESOURCE_BUNDLE.getString("error.config.empty_translation_section"));
                } else {
                    if (fileBean.getTranslation().contains("**") && fileBean.getSource() != null && !fileBean.getSource().contains("**")) {
                        errors.add(RESOURCE_BUNDLE.getString("error.config.double_asteriks"));
                    }
                    if (!containsLangPlaceholders(fileBean.getTranslation()) && fileBean.getScheme() == null) {
                        errors.add(RESOURCE_BUNDLE.getString("error.config.translation_has_no_language_placeholders"));
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
            }
        }
        return errors;
    }

    private static boolean containsLangPlaceholders(String translation) {
        return StringUtils.containsAny(translation,
                "%language%",
                "%two_letters_code%",
                "%three_letters_code%",
                "%locale_with_underscore%",
                "%locale%",
                "%android_code%",
                "%osx_code%",
                "%osx_locale%");
    }
}