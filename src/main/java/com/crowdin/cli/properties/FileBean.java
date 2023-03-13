package com.crowdin.cli.properties;

import com.crowdin.cli.commands.functionality.SourcesUtils;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import lombok.Data;
import org.apache.commons.lang3.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.properties.PropertiesBuilder.CONTENT_SEGMENTATION;
import static com.crowdin.cli.properties.PropertiesBuilder.CUSTOM_SEGMENTATION;
import static com.crowdin.cli.properties.PropertiesBuilder.DEST;
import static com.crowdin.cli.properties.PropertiesBuilder.ESCAPE_QUOTES;
import static com.crowdin.cli.properties.PropertiesBuilder.ESCAPE_SPECIAL_CHARACTERS;
import static com.crowdin.cli.properties.PropertiesBuilder.EXCLUDED_TARGET_LANGUAGES;
import static com.crowdin.cli.properties.PropertiesBuilder.EXPORT_APPROVED_ONLY;
import static com.crowdin.cli.properties.PropertiesBuilder.FIRST_LINE_CONTAINS_HEADER;
import static com.crowdin.cli.properties.PropertiesBuilder.IGNORE;
import static com.crowdin.cli.properties.PropertiesBuilder.LABELS;
import static com.crowdin.cli.properties.PropertiesBuilder.LANGUAGES_MAPPING;
import static com.crowdin.cli.properties.PropertiesBuilder.MULTILINGUAL_SPREADSHEET;
import static com.crowdin.cli.properties.PropertiesBuilder.SCHEME;
import static com.crowdin.cli.properties.PropertiesBuilder.SKIP_UNTRANSLATED_FILES;
import static com.crowdin.cli.properties.PropertiesBuilder.SKIP_UNTRANSLATED_STRINGS;
import static com.crowdin.cli.properties.PropertiesBuilder.EXPORT_STRINGS_THAT_PASSED_WORKFLOW;
import static com.crowdin.cli.properties.PropertiesBuilder.SOURCE;
import static com.crowdin.cli.properties.PropertiesBuilder.TRANSLATABLE_ELEMENTS;
import static com.crowdin.cli.properties.PropertiesBuilder.TRANSLATE_ATTRIBUTES;
import static com.crowdin.cli.properties.PropertiesBuilder.TRANSLATE_CONTENT;
import static com.crowdin.cli.properties.PropertiesBuilder.TRANSLATION;
import static com.crowdin.cli.properties.PropertiesBuilder.TRANSLATION_REPLACE;
import static com.crowdin.cli.properties.PropertiesBuilder.TYPE;
import static com.crowdin.cli.properties.PropertiesBuilder.UPDATE_OPTION;
import static com.crowdin.cli.properties.PropertiesBuilder.IMPORT_TRANSLATIONS;
import static com.crowdin.cli.properties.PropertiesBuilder.checkForDoubleAsterisks;
import static com.crowdin.cli.properties.PropertiesBuilder.hasRelativePaths;

@Data
public class FileBean {

    static FileBeanConfigurator CONFIGURATOR = new FileBeanConfigurator();

    private String source;
    private String translation;
    private List<String> ignore;
    private String dest;
    private String type;
    private String updateOption;
    private Map<String, Map<String, String>> languagesMapping;
    private Boolean firstLineContainsHeader;
    private String scheme;
    private Boolean multilingualSpreadsheet;
    private Boolean translateAttributes;
    private Boolean translateContent;
    private List<String> translatableElements;
    private Boolean contentSegmentation;
    private Integer escapeQuotes;
    private Integer escapeSpecialCharacters;
    private Map<String, String> translationReplace;
    private Boolean skipTranslatedOnly;
    private Boolean skipUntranslatedFiles;
    private Boolean exportApprovedOnly;
    private Boolean exportStringsThatPassedWorkflow;
    private List<String> labels;
    private List<String> excludedTargetLanguages;
    private String customSegmentation;
    private Boolean importTranslations;

    static class FileBeanConfigurator implements BeanConfigurator<FileBean> {

        private FileBeanConfigurator() {

        }

        @Override
        public FileBean buildFromMap(Map<String, Object> map) {
            FileBean fileBean = new FileBean();
            PropertiesBuilder.setPropertyIfExists(fileBean::setSource,                    map, SOURCE, String.class);
            PropertiesBuilder.setPropertyIfExists(fileBean::setDest,                      map, DEST, String.class);
            PropertiesBuilder.setPropertyIfExists(fileBean::setType,                      map, TYPE, String.class);
            PropertiesBuilder.setPropertyIfExists(fileBean::setTranslation,               map, TRANSLATION, String.class);
            PropertiesBuilder.setPropertyIfExists(fileBean::setUpdateOption,              map, UPDATE_OPTION, String.class);
            PropertiesBuilder.setPropertyIfExists(fileBean::setScheme,                    map, SCHEME, String.class);
            PropertiesBuilder.setPropertyIfExists(fileBean::setIgnore,                    map, IGNORE, List.class);
            PropertiesBuilder.setPropertyIfExists(fileBean::setTranslatableElements,      map, TRANSLATABLE_ELEMENTS, List.class);
            PropertiesBuilder.setPropertyIfExists(fileBean::setLanguagesMapping,          map, LANGUAGES_MAPPING, Map.class);
            PropertiesBuilder.setPropertyIfExists(fileBean::setTranslationReplace,        map, TRANSLATION_REPLACE, Map.class);
            PropertiesBuilder.setPropertyIfExists(fileBean::setEscapeQuotes,              map, ESCAPE_QUOTES, Integer.class);
            PropertiesBuilder.setPropertyIfExists(fileBean::setEscapeSpecialCharacters,   map, ESCAPE_SPECIAL_CHARACTERS, Integer.class);
            PropertiesBuilder.setBooleanPropertyIfExists(fileBean::setFirstLineContainsHeader,   map, FIRST_LINE_CONTAINS_HEADER);
            PropertiesBuilder.setBooleanPropertyIfExists(fileBean::setTranslateAttributes,       map, TRANSLATE_ATTRIBUTES);
            PropertiesBuilder.setBooleanPropertyIfExists(fileBean::setTranslateContent,          map, TRANSLATE_CONTENT);
            PropertiesBuilder.setBooleanPropertyIfExists(fileBean::setContentSegmentation,       map, CONTENT_SEGMENTATION);
            PropertiesBuilder.setBooleanPropertyIfExists(fileBean::setMultilingualSpreadsheet,   map, MULTILINGUAL_SPREADSHEET);
            PropertiesBuilder.setBooleanPropertyIfExists(fileBean::setSkipTranslatedOnly,   map, SKIP_UNTRANSLATED_STRINGS);
            PropertiesBuilder.setBooleanPropertyIfExists(fileBean::setSkipUntranslatedFiles,     map, SKIP_UNTRANSLATED_FILES);
            PropertiesBuilder.setBooleanPropertyIfExists(fileBean::setExportApprovedOnly,        map, EXPORT_APPROVED_ONLY);
            PropertiesBuilder.setBooleanPropertyIfExists(fileBean::setExportStringsThatPassedWorkflow, map, EXPORT_STRINGS_THAT_PASSED_WORKFLOW);
            PropertiesBuilder.setPropertyIfExists(fileBean::setLabels,                    map, LABELS, List.class);
            PropertiesBuilder.setPropertyIfExists(fileBean::setExcludedTargetLanguages,   map, EXCLUDED_TARGET_LANGUAGES, List.class);
            PropertiesBuilder.setPropertyIfExists(fileBean::setCustomSegmentation,        map, CUSTOM_SEGMENTATION, String.class);
            PropertiesBuilder.setBooleanPropertyIfExists(fileBean::setImportTranslations, map, IMPORT_TRANSLATIONS);
            return fileBean;
        }

        @Override
        public void populateWithDefaultValues(FileBean bean) {
            //Source
            if (bean.getSource() != null) {
                bean.setSource(Utils.normalizePath(bean.getSource()));
            }
            //Translation
            if (bean.getTranslation() != null) {
                bean.setTranslation(Utils.normalizePath(bean.getTranslation()));
                if (!PlaceholderUtil.containsLangPlaceholders(bean.getTranslation()) && bean.getScheme() != null) {
                    bean.setTranslation(Utils.noSepAtStart(bean.getTranslation()));
                } else {
                    bean.setTranslation(Utils.sepAtStart(bean.getTranslation()));
                }
            }


            //Ignore
            if (bean.getIgnore() != null && !bean.getIgnore().isEmpty()) {
                List<String> ignores = new ArrayList<>();
                for (String ignore : bean.getIgnore()) {
                    ignores.add(ignore.replaceAll("[/\\\\]+", Utils.PATH_SEPARATOR_REGEX));
                }
                bean.setIgnore(ignores);
            }
            //dest
            if (StringUtils.isNotEmpty(bean.getDest())) {
                bean.setDest(bean.getDest().replaceAll("[/\\\\]+", Utils.PATH_SEPARATOR_REGEX));
            }
            //Translate attributes
            if (bean.getTranslateAttributes() == null) {
                bean.setTranslateAttributes(Boolean.FALSE);
            }
            //Translate content
            bean.setTranslateContent(bean.getTranslateContent() != null ? bean.getTranslateContent() : Boolean.TRUE);
            //Content segmentation
            bean.setContentSegmentation(bean.getContentSegmentation());
            //escape quotes
            if (bean.getEscapeQuotes() == null) {
                bean.setEscapeQuotes(3);
            }
            //first line contain header
            if (bean.getFirstLineContainsHeader() == null) {
                bean.setFirstLineContainsHeader(Boolean.FALSE);
            }
            if (bean.getCustomSegmentation() != null) {
                bean.setCustomSegmentation(Utils.normalizePath(bean.getCustomSegmentation()));
            }

            if (bean.getImportTranslations() == null) {
                bean.setImportTranslations(Boolean.FALSE);
            }
        }

        @Override
        public List<String> checkProperties(FileBean bean) {
            List<String> errors = new ArrayList<>();
            if (StringUtils.isEmpty(bean.getSource())) {
                errors.add(RESOURCE_BUNDLE.getString("error.config.empty_source_section"));
            }
            if (StringUtils.isEmpty(bean.getTranslation())) {
                errors.add(RESOURCE_BUNDLE.getString("error.config.empty_translation_section"));
            } else {
                if (!checkForDoubleAsterisks(bean.getSource(), bean.getTranslation())) {
                    errors.add(RESOURCE_BUNDLE.getString("error.config.double_asterisk"));
                }
                if (!PlaceholderUtil.containsLangPlaceholders(bean.getTranslation()) && bean.getScheme() == null) {
                    errors.add(RESOURCE_BUNDLE.getString("error.config.translation_has_no_language_placeholders"));
                }
                if (hasRelativePaths(bean.getTranslation())) {
                    errors.add(RESOURCE_BUNDLE.getString("error.config.translation_contains_relative_paths"));
                }
            }

            String updateOption = bean.getUpdateOption();
            if (updateOption != null && !(updateOption.equals("update_as_unapproved") || updateOption.equals("update_without_changes"))) {
                errors.add(RESOURCE_BUNDLE.getString("error.config.update_option"));
            }
            Integer escQuotes = bean.getEscapeQuotes();
            if (escQuotes != null && (escQuotes < 0 || escQuotes > 3)) {
                errors.add(RESOURCE_BUNDLE.getString("error.config.escape_quotes"));
            }
            Integer escSpecialCharacters = bean.getEscapeSpecialCharacters();
            if (escSpecialCharacters != null && (escSpecialCharacters < 0 || escSpecialCharacters > 1)) {
                errors.add(RESOURCE_BUNDLE.getString("error.config.escape_special_characters"));
            }

            if (StringUtils.isNotEmpty(bean.getDest()) && !checkDest(bean.getDest(), bean.getSource())) {
                errors.add(RESOURCE_BUNDLE.getString("error.dest_and_pattern_in_source"));
            }
            if (bean.getSkipTranslatedOnly() != null && bean.getSkipUntranslatedFiles() != null
                && bean.getSkipTranslatedOnly() && bean.getSkipUntranslatedFiles()) {
                errors.add(RESOURCE_BUNDLE.getString("error.skip_untranslated_both_strings_and_files"));
            }
            return errors;
        }
    }

    private static boolean checkDest(String dest, String source) {
        boolean destContainsPlaceholders = dest.contains(PlaceholderUtil.PLACEHOLDER_FILE_NAME)
            || dest.contains(PlaceholderUtil.PLACEHOLDER_ORIGINAL_FILE_NAME)
            || dest.contains(PlaceholderUtil.PLACEHOLDER_ORIGINAL_PATH)
            || dest.contains(PlaceholderUtil.PLACEHOLDER_FILE_EXTENSION)
            || dest.contains(PlaceholderUtil.DOUBLED_ASTERISK);
        boolean sourceContainsPlaceholders = PlaceholderUtil.containsFilePlaceholders(source) || SourcesUtils.containsPattern(source);
        return !sourceContainsPlaceholders || destContainsPlaceholders;
    }

}