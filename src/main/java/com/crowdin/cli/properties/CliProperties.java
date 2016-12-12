package com.crowdin.cli.properties;

import com.crowdin.cli.utils.MessageSource;
import com.crowdin.cli.utils.Utils;

import java.io.File;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ResourceBundle;

/**
 * @author ihor
 */
public class CliProperties {

    private static final ResourceBundle RESOURCE_BUNDLE = MessageSource.RESOURCE_BUNDLE;

    private static final String PROJECT_IDENTIFIER = "project_identifier";

    private static final String PROJECT_IDENTIFIER_ENV = "project_identifier_env";

    private static final String API_KEY = "api_key";

    private static final String API_KEY_ENV = "api_key_env";

    private static final String BASE_PATH = "base_path";

    private static final String BASE_PATH_ENV = "base_path_env";

    private static final String BASE_URL = "base_url";

    private static final String BASE_URL_ENV = "base_url_env";

    private static final String ACCOUNT_KEY = "account_key";

    private static final String ACCOUNT_KEY_ENV = "account_key_env";

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

    private static final String PATH_SEPARATOR = (Utils.isWindows()) ? File.separator + File.separator : File.separator;

    public PropertiesBean loadProperties(HashMap<String, Object> properties) {
        if (properties == null || properties.isEmpty()) {
            System.out.println(RESOURCE_BUNDLE.getString("error_empty_properties_file"));
            System.exit(0);
        }
        PropertiesBean pb = new PropertiesBean();
        for (Map.Entry<String, Object> property : properties.entrySet()) {
            //From environment variables
            if (property != null && property.getKey() != null) {
                switch (property.getKey()) {
                    case ACCOUNT_KEY_ENV :
                        pb.setAccountKey(Utils.getEnvironmentVariable(property.getValue().toString()));
                        break;
                    case API_KEY_ENV :
                        pb.setApiKey(Utils.getEnvironmentVariable(property.getValue().toString()));
                        break;
                    case BASE_PATH_ENV :
                        pb.setBasePath(Utils.getEnvironmentVariable(property.getValue().toString()));
                        break;
                    case BASE_URL_ENV :
                        pb.setBaseUrl(Utils.getEnvironmentVariable(property.getValue().toString()));
                        break;
                    case PROJECT_IDENTIFIER_ENV :
                        pb.setProjectIdentifier(Utils.getEnvironmentVariable(property.getValue().toString()));
                        break;
                    default:
                        break;
                }
            }
        }
        for (Map.Entry<String, Object> property : properties.entrySet()) {
            if (property != null && property.getKey() != null) {
                switch (property.getKey()) {
                    case ACCOUNT_KEY :
                        if (property.getValue() != null && !property.getValue().toString().isEmpty()) {
                            pb.setAccountKey(property.getValue().toString());
                        }
                        break;
                    case API_KEY :
                        if (property.getValue() != null && !property.getValue().toString().isEmpty()) {
                            pb.setApiKey(property.getValue().toString());
                        }
                        break;
                    case BASE_PATH :
                        if (property.getValue() != null && !property.getValue().toString().isEmpty()) {
                            pb.setBasePath(property.getValue().toString());
                        }
                        break;
                    case BASE_URL :
                        if (property.getValue() != null && !property.getValue().toString().isEmpty()) {
                            pb.setBaseUrl(property.getValue().toString());
                        }
                        break;
                    case PROJECT_IDENTIFIER :
                        if (property.getValue() != null && !property.getValue().toString().isEmpty()) {
                            pb.setProjectIdentifier(property.getValue().toString());
                        }
                        break;
                    case PRESERVE_HIERARCHY :
                        pb.setPreserveHierarchy(Boolean.parseBoolean(property.getValue().toString()));
                        break;
                    case FILES :
                        ArrayList files = (ArrayList) property.getValue();
                        for (Object file : files) {
                            FileBean fileBean = new FileBean();
                            HashMap<String, Object> fileObj = (HashMap<String, Object>) file;
                            for (Map.Entry<String, Object> entry : fileObj.entrySet()) {
                                String fileObjKey = entry.getKey();
                                Object fileObjVal = entry.getValue();
                                switch (fileObjKey) {
                                    case SOURCE :
                                        fileBean.setSource(fileObjVal.toString());
                                        break;
                                    case IGNORE :
                                        fileBean.setIgnore((List<String>) fileObjVal);
                                        break;
                                    case DEST :
                                        fileBean.setDest(fileObjVal.toString());
                                        break;
                                    case TYPE :
                                        fileBean.setType(fileObjVal.toString());
                                        break;
                                    case TRANSLATION :
                                        fileBean.setTranslation(fileObjVal.toString());
                                        break;
                                    case UPDATE_OPTION :
                                        fileBean.setUpdateOption(fileObjVal.toString());
                                        break;
                                    case LANGUAGES_MAPPING :
                                        HashMap<String, HashMap<String, String>> languagesMapping = new HashMap<String, HashMap<String, String>>();
                                        languagesMapping = (HashMap<String, HashMap<String, String>>) fileObjVal;
                                        fileBean.setLanguagesMapping(languagesMapping);
                                        break;
                                    case FIRST_LINE_CONTAINS_HEADER :
                                        if ("1".equals(fileObjVal.toString())) {
                                            fileBean.setFirstLineContainsHeader(Boolean.TRUE);
                                        } else if ("0".equals(fileObjVal.toString())) {
                                            fileBean.setFirstLineContainsHeader(Boolean.FALSE);
                                        } else {
                                            fileBean.setFirstLineContainsHeader(Boolean.valueOf(fileObjVal.toString()));
                                        }
                                        break;
                                    case TRANSLATE_ATTRIBUTES :
                                        if ("1".equals(fileObjVal.toString())) {
                                            fileBean.setTranslateAttributes(Boolean.TRUE);
                                        } else if ("0".equals(fileObjVal.toString())) {
                                            fileBean.setTranslateAttributes(Boolean.FALSE);
                                        } else {
                                            fileBean.setTranslateAttributes(Boolean.valueOf(fileObjVal.toString()));
                                        }
                                        break;
                                    case TRANSLATE_CONTENT :
                                        if ("1".equals(fileObjVal.toString())) {
                                            fileBean.setTranslateContent(Boolean.TRUE);
                                        } else if ("0".equals(fileObjVal.toString())) {
                                            fileBean.setTranslateContent(Boolean.FALSE);
                                        } else {
                                            fileBean.setTranslateContent(Boolean.valueOf(fileObjVal.toString()));
                                        }
                                        break;
                                    case TRANSLATABLE_ELEMENTS :
                                        fileBean.setTranslatableElements((List<String>) fileObjVal);
                                        break;
                                    case CONTENT_SEGMENTATION :
                                        if ("1".equals(fileObjVal.toString())) {
                                            fileBean.setContentSegmentation(Boolean.TRUE);
                                        } else if ("0".equals(fileObjVal.toString())) {
                                            fileBean.setContentSegmentation(Boolean.FALSE);
                                        } else {
                                            fileBean.setContentSegmentation(Boolean.valueOf(fileObjVal.toString()));
                                        }
                                        break;
                                    case ESCAPE_QUOTES :
                                        fileBean.setEscapeQuotes(Short.valueOf(fileObjVal.toString()));
                                        break;
                                    case MULTILINGUAL_SPREADSHEET :
                                        if ("1".equals(fileObjVal.toString())) {
                                            fileBean.setMultilingualSpreadsheet(Boolean.TRUE);
                                        } else if ("0".equals(fileObjVal.toString())) {
                                            fileBean.setMultilingualSpreadsheet(Boolean.FALSE);
                                        } else {
                                            fileBean.setMultilingualSpreadsheet(Boolean.valueOf(fileObjVal.toString()));
                                        }
                                        break;
                                    case SCHEME :
                                        fileBean.setScheme(fileObjVal.toString());
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

    //todo set default values
    public PropertiesBean validateProperties(PropertiesBean pb) {
        //Property bean
        if (pb == null) {
            System.out.println(RESOURCE_BUNDLE.getString("error_property_bean_null"));
            System.exit(0);
        }
        //Preserve hierarchy
        if (pb.getPreserveHierarchy() == null) {
            pb.setPreserveHierarchy(Boolean.FALSE);
        }
        if (pb.getBasePath() != null) {
            if (!Paths.get(pb.getBasePath()).isAbsolute()){
                System.out.println(RESOURCE_BUNDLE.getString("bad_base_path"));
                System.exit(0);
            }
        } else {
            pb.setBasePath("");
        }
        //Files
        if (pb.getFiles() == null) {
            System.out.println(RESOURCE_BUNDLE.getString("error_empty_section_files"));
        } else {
            boolean hasValidFile = false;
            for (FileBean file : pb.getFiles()) {
                boolean hasError = false;
                //Sources
                if (file.getSource() == null || file.getSource().isEmpty()) {
                    System.out.println(RESOURCE_BUNDLE.getString("error_empty_source_section"));
                    hasError = true;
                }
                //Translation
                if (file.getTranslation() == null || file.getTranslation().isEmpty()) {
                    System.out.println(RESOURCE_BUNDLE.getString("error_empty_translation_section"));
                    hasError = true;
                }
                if (file.getTranslation() != null && file.getTranslation().contains("**") && file.getSource() != null && !file.getSource().contains("**")) {
                    System.out.println("error: Translation pattern " + file.getTranslation() + " is not valid. The mask `**` can't be used.");
                    System.out.println("When using `**` in 'translation' pattern it will always contain sub-path from 'source' for certain file.");
                    hasError = true;
                }
                if (file.getTranslation() != null && !file.getTranslation().startsWith(PATH_SEPARATOR)) {
                    if (file.getTranslation().contains("%language%")
                            || file.getTranslation().contains("%two_letters_code%")
                            || file.getTranslation().contains("%three_letters_code%")
                            || file.getTranslation().contains("%locale%")) {
                        String translation = PATH_SEPARATOR + file.getTranslation();
                        translation = translation.replaceAll(PATH_SEPARATOR + "+", PATH_SEPARATOR);
                        file.setTranslation(translation);
                    }
                }
                //Ignore
                if (file.getIgnore() == null || file.getIgnore().isEmpty()) {
                } else {
                }
                //dest
                if (file.getDest() == null || file.getDest().isEmpty()) {
                } else {
                }
                //Type
                if (file.getType() == null || file.getType().isEmpty()) {
                } else {
                }
                //Update option
                if (file.getUpdateOption() == null || file.getUpdateOption().isEmpty()) {
                } else {
                    if (!"update_as_unapproved".equals(file.getUpdateOption()) && !"update_without_changes".equals(file.getUpdateOption())) {
                        System.out.println("Parameter 'update_option' in configuration file has unacceptable value");
                        hasError = true;
                    }
                }
                //Translate attributes
                if (file.getTranslateAttributes() == null) {
                } else {
                }
                //Translate content
                if (file.getTranslateContent() == null) {
                    file.setTranslateContent(Boolean.TRUE);
                } else {
                }
                //Translatable elements
                if (file.getTranslatableElements() == null || file.getTranslatableElements().isEmpty()) {
                } else {
                }
                //Content segmentation
                if (file.getContentSegmentation() == null) {
                    file.setContentSegmentation(Boolean.TRUE);
                } else {
                }
                //escape quotes
                if (file.getEscapeQuotes() < 0 || file.getEscapeQuotes() > 3) {
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
                if (file.getScheme() == null || file.getScheme().isEmpty()) {
                } else {
                }
                if (hasError == false) {
                    hasValidFile = true;
                }
            }
            if (!hasValidFile) {
                System.exit(0);
            }
        }
        return pb;
    }

}