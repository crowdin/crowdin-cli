package com.crowdin.cli.properties;

import com.crowdin.cli.commands.Outputter;
import io.github.cdimascio.dotenv.Dotenv;
import lombok.NonNull;
import org.apache.commons.lang3.StringUtils;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

/**
 * Loads Properties from map. Источником для параметров являются мапа с
 * параметрами(полученная из конфигурационного файла), мапа с параметрами
 * из identity файла и параметры, переданные через аргументы(содержатся в T обьекте
 * @param <T> Type of properties
 * @param <P> Parameters from command line
 */
public abstract class PropertiesBuilder<T extends Properties, P extends Params> {

    private static Dotenv dotenv;

    public static final String PROJECT_ID = "project_id";

    public static final String PROJECT_ID_ENV = "project_id_env";

    public static final String API_TOKEN = "api_token";

    public static final String API_TOKEN_ENV = "api_token_env";

    public static final String BASE_PATH = "base_path";

    public static final String BASE_PATH_ENV = "base_path_env";

    public static final String BASE_URL = "base_url";

    public static final String BASE_URL_ENV = "base_url_env";

    public static final String PRESERVE_HIERARCHY = "preserve_hierarchy";

    public static final String FILES = "files";

    public static final String SOURCE = "source";

    public static final String IGNORE = "ignore";

    public static final String DEST = "dest";

    public static final String TYPE = "type";

    public static final String TRANSLATION = "translation";

    public static final String UPDATE_OPTION = "update_option";

    public static final String LANGUAGES_MAPPING = "languages_mapping";

    public static final String FIRST_LINE_CONTAINS_HEADER = "first_line_contains_header";

    public static final String TRANSLATE_ATTRIBUTES = "translate_attributes";

    public static final String TRANSLATE_CONTENT = "translate_content";

    public static final String TRANSLATABLE_ELEMENTS = "translatable_elements";

    public static final String CONTENT_SEGMENTATION = "content_segmentation";

    public static final String ESCAPE_QUOTES = "escape_quotes";

    public static final String ESCAPE_SPECIAL_CHARACTERS = "escape_special_characters";

    public static final String MULTILINGUAL_SPREADSHEET = "multilingual_spreadsheet";

    public static final String SCHEME = "scheme";

    public static final String TRANSLATION_REPLACE = "translation_replace";

    public static final String TARGETS = "targets";

    public static final String NAME = "name";

    public static final String FILE = "file";

    public static final String SOURCES = "sources";

    public static final String DIRECTORIES = "directories";

    public static final String BRANCHES = "branches";

    public static final String LABELS = "labels";

    public static final String PSEUDO_LOCALIZATION = "pseudo_localization";

    public static final String LENGTH_CORRECTION = "length_correction";

    public static final String PREFIX = "prefix";

    public static final String SUFFIX = "suffix";

    public static final String CHARACTER_TRANSFORMATION = "character_transformation";

    public static final String SKIP_UNTRANSLATED_STRINGS = "skip_untranslated_strings";

    public static final String SKIP_UNTRANSLATED_FILES = "skip_untranslated_files";

    public static final String EXPORT_APPROVED_ONLY = "export_only_approved";

    public static final String EXPORT_STRINGS_THAT_PASSED_WORKFLOW = "export_strings_that_passed_workflow";

    public static final String EXCLUDED_TARGET_LANGUAGES = "excluded_target_languages";

    public static final String CUSTOM_SEGMENTATION = "custom_segmentation";

    public static final String SETTINGS = "settings";

    public static final String IGNORE_HIDDEN_FILES = "ignore_hidden_files";

    public static final String CONFIG_FILE_PATH = "config_file_path";

    public static final String IMPORT_TRANSLATIONS = "import_translations";

    private Outputter out;
    private Map<String, Object> configFileParams;
    private Map<String, Object> identityFileParams;
    private P params;

    public PropertiesBuilder(Outputter out) {
        this.out = out;
    }

    public PropertiesBuilder<T, P> addConfigParams(Map<String, Object> configFileParams) {
        if (configFileParams != null) {
            this.configFileParams = configFileParams;
        }
        return this;
    }

    public PropertiesBuilder<T, P> addIdentityParams(Map<String, Object> identityFileParams) {
        if (identityFileParams != null) {
            this.identityFileParams = identityFileParams;
        }
        return this;
    }

    public PropertiesBuilder<T, P> addParams(P params) {
        if (params != null) {
            this.params = params;
        }
        return this;
    }

    public T build() {
        T props = this.getEmptyInstance();
        if (configFileParams != null) {
            this.populateWithConfigFileParams(props, configFileParams);
        }
        if (identityFileParams != null) {
            this.populateWithIdentityFileParams(props, identityFileParams);
        }
        if (this.params != null) {
            this.throwErrorIfNeeded(this.checkArgParams(params), RESOURCE_BUNDLE.getString("error.params_are_invalid"));
            this.populateWithArgParams(props, params);
        }
        this.populateWithDefaultValues(props);
        String errorTitle = (configFileParams == null && identityFileParams == null)
            ? RESOURCE_BUNDLE.getString("error.configuration_is_invalid")
            : RESOURCE_BUNDLE.getString("error.configuration_file_is_invalid");
        this.throwErrorIfNeeded(this.checkProperties(props), errorTitle);
        return props;
    }

    private void throwErrorIfNeeded(Messages messages, String text) {
        messages.getWarnings().stream()
            .map(WARNING::withIcon)
            .forEach(out::println);
        if (!messages.getErrors().isEmpty()) {
            String errorsInOne = messages.getErrors().stream()
                .map(error -> String.format(RESOURCE_BUNDLE.getString("message.item_list"), error))
                .collect(Collectors.joining("\n"));
            throw new RuntimeException(text + "\n" + errorsInOne);
        }
    }

    protected abstract T getEmptyInstance();

    protected abstract void populateWithIdentityFileParams(T props, @NonNull Map<String, Object> identityFileParams);

    protected abstract void populateWithConfigFileParams(T props, @NonNull Map<String, Object> configFileParams);

    protected abstract Messages checkArgParams(@NonNull P params);

    protected abstract void populateWithArgParams(T props, @NonNull P params);

    protected abstract void populateWithDefaultValues(T props);

    protected abstract Messages checkProperties(T props);

    static List<Map<String, Object>> getListOfMaps(Map<String, Object> map, String key) {
        List<?> list = PropertiesBuilder.checkProperty(map, key, List.class, Collections.emptyList());
        for (Object obj : list) {
            if (!(obj instanceof Map)) {
                throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.cast_param_list_type"), key, typeName(obj.getClass()), typeName(Map.class)));
            }
        }
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> returnType = (List<Map<String, Object>>) list;
        return returnType;
    }

    static Map<String, Object> getMap(Map<String, Object> map, String key) {
        @SuppressWarnings("unchecked")
        Map<String, Object> returnType = (Map<String, Object>) PropertiesBuilder.checkProperty(map, key, Map.class, Collections.emptyMap());
        return returnType;
    }

    static void setEnvOrPropertyIfExists(Consumer<String> setter, Map<String, Object> properties, String envKey, String key) {
        String param = properties.containsKey(envKey)
            ? getDotenv().get(properties.get(envKey).toString())
            : (properties.containsKey(key))
            ? (properties.get(key) != null) ? properties.get(key).toString() : null
            : null;
        if (param != null) {
            setter.accept(param);
        }
    }

    private static Dotenv getDotenv() {
        if (dotenv == null) {
            try {
                dotenv = Dotenv.configure().ignoreIfMissing().load();
            } catch (IllegalStateException e) {
                if (e.getMessage() != null && e.getMessage().contains("Duplicate key")) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.duplicate_environment_variable"), e);
                } else {
                    throw e;
                }
            }
        }
        return dotenv;
    }

    static void setBooleanPropertyIfExists(Consumer<Boolean> setter, Map<String, Object> properties, String key) {
        Boolean param = properties.containsKey(key)
            ? properties.get(key).toString().equals("1")
                ? Boolean.TRUE
                : Boolean.valueOf(properties.get(key).toString())
            : null;
        if (param != null) {
            setter.accept(param);
        }
    }

    static <T> void setPropertyIfExists(Consumer<T> setter, Map<String, Object> properties, String key, Class<T> clazz) {
        T param = checkProperty(properties, key, clazz, null);
        if (param != null) {
            setter.accept(param);
        }
    }

    private static <T> T checkProperty(Map<String, Object> properties, String key, Class<T> clazz, T defaultValue) {
        try {
           Object  param = properties.getOrDefault(key, defaultValue);
            if (param != null && !clazz.isAssignableFrom(param.getClass())) {
                String desiredType = typeName(clazz);
                String presentType = typeName(param.getClass());
                throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.cast_param_type"), key, presentType, desiredType));
            }
            @SuppressWarnings("unchecked")
            T paramWithType = (T) param;
            return paramWithType;
        } catch (ClassCastException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.cast_param"), key), e);
        }
    }

    private static String typeName(Class<?> clazz) {
        if (Integer.class.isAssignableFrom(clazz)) {
            return "Integer";
        } else if (Double.class.isAssignableFrom(clazz)) {
            return "Double";
        } else if (Boolean.class.isAssignableFrom(clazz)) {
            return "Boolean";
        } else if (String.class.isAssignableFrom(clazz)) {
            return "String";
        } else if (List.class.isAssignableFrom(clazz)) {
            return "List";
        } else {
            return "Map";
        }
    }

    static void setEnumPropertyIfExists(Consumer<String> setter, Map<String, Object> properties, String key, String acceptableValuesEnum) {
        try {
            String param = (String) properties.get(key);
            if (param != null) {
                setter.accept(param);
            }
        } catch (ClassCastException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.config.enum_class_exception"), key, acceptableValuesEnum));
        } catch (IllegalArgumentException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.config.enum_wrong_value"), key, acceptableValuesEnum));
        }
    }

    protected static boolean checkBasePathExists(String basePath) {
        return Files.exists(Paths.get(basePath));
    }

    protected static boolean checkBasePathIsDir(String basePath) {
        return Files.isDirectory(Paths.get(basePath));
    }

    protected static boolean checkForDoubleAsterisks(String source, String translation) {
        return !(StringUtils.contains(translation, "**") && !StringUtils.contains(source, "**"));
    }

    protected static boolean hasRelativePaths(String path) {
        return StringUtils.containsAny(path, "../", "/./");
    }


    static class Messages {
        private List<String> errors = new ArrayList<>();
        private List<String> warnings = new ArrayList<>();

        public void addError(String error) {
            this.errors.add(error);
        }

        public void addAllErrors(List<String> errors) {
            this.errors.addAll(errors);
        }

        public void addWarning(String warning) {
            this.warnings.add(warning);
        }

        public void populate(Messages other) {
            this.errors.addAll(other.errors);
            this.warnings.addAll(other.warnings);
        }

        public List<String> getErrors() {
            return errors;
        }

        public List<String> getWarnings() {
            return warnings;
        }
    }
}
