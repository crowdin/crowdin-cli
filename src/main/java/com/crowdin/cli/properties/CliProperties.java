package com.crowdin.cli.properties;

import com.crowdin.cli.utils.MessageSource;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleUtils;
import org.apache.commons.lang3.StringUtils;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;

import static com.crowdin.cli.utils.MessageSource.Messages;


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

    private static final String MULTILINGUAL_SPREADSHEET = "multilingual_spreadsheet";

    private static final String SCHEME = "scheme";

    private static final String TRANSLATION_REPLACE = "translation_replace";

    public PropertiesBean loadProperties(HashMap<String, Object> properties) {
        if (properties == null) {
            throw new NullPointerException("CliProperties.loadProperties has null args");
        }
        if (properties.isEmpty()) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error_empty_properties_file"));
        }
        PropertiesBean pb = new PropertiesBean();
        for (Map.Entry<String, Object> property : properties.entrySet()) {
            if (property != null && property.getKey() != null) {
                switch (property.getKey()) {
                    case API_TOKEN_ENV:
                        pb.setApiToken(Utils.getEnvironmentVariable(property.getValue().toString()));
                        break;
                    case BASE_PATH_ENV:
                        pb.setBasePath(Utils.getEnvironmentVariable(property.getValue().toString()));
                        break;
                    case BASE_URL_ENV:
                        pb.setBaseUrl(Utils.getEnvironmentVariable(property.getValue().toString()));
                        break;
                    case PROJECT_ID_ENV:
                        pb.setProjectId(Utils.getEnvironmentVariable(property.getValue().toString()));
                        break;
                    default:
                        break;
                }
            }
        }

        for (Map.Entry<String, Object> property : properties.entrySet()) {
            if (property != null && property.getKey() != null) {
                switch (property.getKey()) {
                    case API_TOKEN:
                        if (property.getValue() != null && !property.getValue().toString().isEmpty()) {
                            pb.setApiToken(property.getValue().toString());
                        }
                        break;
                    case BASE_PATH:
                        if (property.getValue() != null && !property.getValue().toString().isEmpty()) {
                            pb.setBasePath(property.getValue().toString());
                        }
                        break;
                    case BASE_URL:
                        if (property.getValue() != null && !property.getValue().toString().isEmpty()) {
                            pb.setBaseUrl(property.getValue().toString());
                        }
                        break;
                    case PROJECT_ID:
                        if (property.getValue() != null && !property.getValue().toString().isEmpty()) {
                            pb.setProjectId(property.getValue().toString());
                        }
                        break;
                    case PRESERVE_HIERARCHY:
                        pb.setPreserveHierarchy(Boolean.parseBoolean(property.getValue().toString()));
                        break;
                    case FILES:
                        ArrayList files = (ArrayList) property.getValue();
                        for (Object file : files) {
                            FileBean fileBean = new FileBean();
                            HashMap<String, Object> fileObj = (HashMap<String, Object>) file;
                            for (Map.Entry<String, Object> entry : fileObj.entrySet()) {
                                String fileObjKey = entry.getKey();
                                Object fileObjVal = entry.getValue();
                                switch (fileObjKey) {
                                    case SOURCE:
                                        fileBean.setSource(fileObjVal.toString());
                                        break;
                                    case IGNORE:
                                        fileBean.setIgnore((List<String>) fileObjVal);
                                        break;
                                    case DEST:
                                        fileBean.setDest(fileObjVal.toString());
                                        break;
                                    case TYPE:
                                        fileBean.setType(fileObjVal.toString());
                                        break;
                                    case TRANSLATION:
                                        fileBean.setTranslation(fileObjVal.toString());
                                        break;
                                    case UPDATE_OPTION:
                                        fileBean.setUpdateOption(fileObjVal.toString());
                                        break;
                                    case LANGUAGES_MAPPING:
                                        HashMap<String, HashMap<String, String>> languagesMapping = new HashMap<>();
                                        languagesMapping = (HashMap<String, HashMap<String, String>>) fileObjVal;
                                        fileBean.setLanguagesMapping(languagesMapping);
                                        break;
                                    case FIRST_LINE_CONTAINS_HEADER:
                                        if ("1".equals(fileObjVal.toString())) {
                                            fileBean.setFirstLineContainsHeader(Boolean.TRUE);
                                        } else if ("0".equals(fileObjVal.toString())) {
                                            fileBean.setFirstLineContainsHeader(Boolean.FALSE);
                                        } else {
                                            fileBean.setFirstLineContainsHeader(Boolean.valueOf(fileObjVal.toString()));
                                        }
                                        break;
                                    case TRANSLATE_ATTRIBUTES:
                                        if ("1".equals(fileObjVal.toString())) {
                                            fileBean.setTranslateAttributes(Boolean.TRUE);
                                        } else if ("0".equals(fileObjVal.toString())) {
                                            fileBean.setTranslateAttributes(Boolean.FALSE);
                                        } else {
                                            fileBean.setTranslateAttributes(Boolean.valueOf(fileObjVal.toString()));
                                        }
                                        break;
                                    case TRANSLATE_CONTENT:
                                        if ("1".equals(fileObjVal.toString())) {
                                            fileBean.setTranslateContent(Boolean.TRUE);
                                        } else if ("0".equals(fileObjVal.toString())) {
                                            fileBean.setTranslateContent(Boolean.FALSE);
                                        } else {
                                            fileBean.setTranslateContent(Boolean.valueOf(fileObjVal.toString()));
                                        }
                                        break;
                                    case TRANSLATABLE_ELEMENTS:
                                        fileBean.setTranslatableElements((List<String>) fileObjVal);
                                        break;
                                    case CONTENT_SEGMENTATION:
                                        if ("1".equals(fileObjVal.toString())) {
                                            fileBean.setContentSegmentation(Boolean.TRUE);
                                        } else if ("0".equals(fileObjVal.toString())) {
                                            fileBean.setContentSegmentation(Boolean.FALSE);
                                        } else {
                                            fileBean.setContentSegmentation(Boolean.valueOf(fileObjVal.toString()));
                                        }
                                        break;
                                    case ESCAPE_QUOTES:
                                        fileBean.setEscapeQuotes(Short.valueOf(fileObjVal.toString()));
                                        break;
                                    case MULTILINGUAL_SPREADSHEET:
                                        if ("1".equals(fileObjVal.toString())) {
                                            fileBean.setMultilingualSpreadsheet(Boolean.TRUE);
                                        } else if ("0".equals(fileObjVal.toString())) {
                                            fileBean.setMultilingualSpreadsheet(Boolean.FALSE);
                                        } else {
                                            fileBean.setMultilingualSpreadsheet(Boolean.valueOf(fileObjVal.toString()));
                                        }
                                        break;
                                    case SCHEME:
                                        fileBean.setScheme(fileObjVal.toString());
                                        break;
                                    case TRANSLATION_REPLACE:
                                        HashMap<String, String> translationReplace;
                                        translationReplace = (HashMap<String, String>) fileObjVal;
                                        fileBean.setTranslationReplace(translationReplace);
                                        break;
                                }
                            }
                            pb.setFiles(fileBean);
                        }
                        break;
                    default:
                        break;
                }
            }
        }
        return pb;
    }

    public PropertiesBean validateProperties(PropertiesBean pb) {

        List<String> errors = checkProperties(pb);
        if (!errors.isEmpty()) {
            String errorsInOne = String.join("\n\t- ", errors);
            throw new RuntimeException(RESOURCE_BUNDLE.getString("configuration_file_is_invalid")+"\n\t- " + errorsInOne);
        }

        setDefaultValues(pb);

        return pb;
    }

    public void setDefaultValues(PropertiesBean pb) {
        if (pb == null || pb.getFiles() == null) {
            throw new NullPointerException("null args in CliProperties.setDefaultValues");
        }
        pb.setPreserveHierarchy(getOr(pb.getPreserveHierarchy(), Boolean.FALSE));
        pb.setBasePath(getNotEmptyStringOr(pb.getBasePath(), ""));

        for (FileBean file : pb.getFiles()) {
            if (Utils.isWindows() && file.getSource() != null) {
                file.setSource(file.getSource().replaceAll("/+", Utils.PATH_SEPARATOR_REGEX));
            }
            if (!Utils.isWindows() && file.getSource() != null) {
                file.setSource(file.getSource().replaceAll("\\\\", Utils.PATH_SEPARATOR_REGEX));
            }
            //Translation
            if (Utils.isWindows() && file.getTranslation() != null && file.getTranslation().contains("/")) {
                file.setTranslation(file.getTranslation().replaceAll("/+", Utils.PATH_SEPARATOR_REGEX));
            }
            if (!Utils.isWindows() && file.getTranslation() != null && file.getTranslation().contains("\\")) {
                file.setTranslation(file.getTranslation().replaceAll("\\\\", Utils.PATH_SEPARATOR_REGEX));
            }
            if (file.getTranslation() != null && !file.getTranslation().startsWith(Utils.PATH_SEPARATOR)) {
                if (file.getTranslation().contains("%language%")
                        || file.getTranslation().contains("%two_letters_code%")
                        || file.getTranslation().contains("%three_letters_code%")
                        || file.getTranslation().contains("%locale%")) {
                    String translation = Utils.PATH_SEPARATOR + file.getTranslation();
                    translation = translation.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
                    file.setTranslation(translation);
                }
            }

            //Ignore
            if (file.getIgnore() == null || file.getIgnore().isEmpty()) {
            } else {
                List<String> ignores = new ArrayList<>();
                for (String ignore : file.getIgnore()) {
                    if (Utils.isWindows() && ignore.contains("/")) {
                        ignores.add(ignore.replaceAll("/+", Utils.PATH_SEPARATOR_REGEX));
                    } else if (!Utils.isWindows() && ignore.contains("\\")) {
                        ignores.add(ignore.replaceAll("\\\\", Utils.PATH_SEPARATOR_REGEX));
                    } else {
                        ignores.add(ignore);
                    }
                }
                file.setIgnore(ignores);
            }
            //dest
            if (StringUtils.isEmpty(file.getDest())) {
            } else {
                if (Utils.isWindows() && file.getDest() != null && file.getDest().contains("/")) {
                    file.setDest(file.getDest().replaceAll("/+", Utils.PATH_SEPARATOR_REGEX));
                }
                if (!Utils.isWindows() && file.getDest() != null && file.getDest().contains("\\")) {
                    file.setDest(file.getDest().replaceAll("\\\\", Utils.PATH_SEPARATOR_REGEX));
                }
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
            file.setTranslateContent(getOr(file.getTranslateContent(), Boolean.TRUE));
            //Translatable elements
            if (file.getTranslatableElements() == null || file.getTranslatableElements().isEmpty()) {
            } else {
            }
            //Content segmentation
            file.setContentSegmentation(getOr(file.getContentSegmentation(), Boolean.TRUE));
            //escape quotes
            if (file.getEscapeQuotes() != null && (file.getEscapeQuotes() < 0 || file.getEscapeQuotes() > 3)) {
                file.setEscapeQuotes((short) 3);
            } else {
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

    private String getNotEmptyStringOr(String toGet, String or) {
        return StringUtils.isNotEmpty(toGet) ? toGet : or;
    }

    private <T> T getOr(T toGet, T or) {
        return (toGet != null) ? toGet : or;
    }

    public List<String> checkProperties(PropertiesBean pb) {
        List<String> errors = new ArrayList<>();
        if (pb == null) {
            errors.add(RESOURCE_BUNDLE.getString("error_property_bean_null"));
            return errors;
        }
        if (StringUtils.isEmpty(pb.getProjectId())) {
            errors.add(RESOURCE_BUNDLE.getString("error_missed_project_id"));
        }
        if (StringUtils.isEmpty(pb.getApiToken())) {
            errors.add(RESOURCE_BUNDLE.getString("error_missed_api_token"));
        }
        if (StringUtils.isEmpty(pb.getBaseUrl())) {
            errors.add(RESOURCE_BUNDLE.getString("error_missed_base_url"));
        }

        if (StringUtils.isNotEmpty(pb.getBasePath())) {
            if (!Paths.get(pb.getBasePath()).isAbsolute()) {
                errors.add(RESOURCE_BUNDLE.getString("bad_base_path"));
            } else if (!Files.isDirectory(Paths.get(pb.getBasePath()))) {
                errors.add(RESOURCE_BUNDLE.getString("bad_base_path"));
            }
        }

        if (pb.getFiles() == null) {
            errors.add(RESOURCE_BUNDLE.getString("error_missed_section_files"));
        } else if (pb.getFiles().isEmpty()) {
            errors.add(RESOURCE_BUNDLE.getString("empty_section_file"));
        } else {
            for (FileBean fileBean : pb.getFiles()) {
                if (StringUtils.isEmpty(fileBean.getSource())) {
                    errors.add(RESOURCE_BUNDLE.getString("error_empty_source_section"));
                }
                if (StringUtils.isEmpty(fileBean.getTranslation())) {
                    errors.add(RESOURCE_BUNDLE.getString("error_empty_translation_section"));
                } else if (fileBean.getTranslation().contains("**") && fileBean.getSource() != null && !fileBean.getSource().contains("**")) {
                    errors.add("error: Translation pattern " + fileBean.getTranslation() + " is not valid. The mask `**` can't be used.\n" +
                            "When using `**` in 'translation' pattern it will always contain sub-path from 'source' for certain file.");
                }
                String updateOption = fileBean.getUpdateOption();
                if (updateOption != null && !(updateOption.equals("update_as_unapproved") || updateOption.equals("update_without_changes"))) {
                    errors.add("Parameter 'update_option' in configuration file has unacceptable value");
                }
            }
        }
        return errors;
    }

    private void printConfigurationFileErrorsAndExit(List<String> errors) {
        System.out.println(Messages.CONFIGURATION_FILE_IS_INVALID.getString());
        errors.forEach(System.out::println);
        ConsoleUtils.exitError();
    }
}