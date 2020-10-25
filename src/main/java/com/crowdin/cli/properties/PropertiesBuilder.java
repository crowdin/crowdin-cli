package com.crowdin.cli.properties;

import lombok.NonNull;
import org.apache.commons.lang3.StringUtils;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

/**
 * Loads Properties from map. Источником для параметров являются мапа с
 * параметрами(полученная из конфигурационного файла), мапа с параметрами
 * из identity файла и параметры, переданные через аргументы(содержатся в T обьекте
 * @param <T> Type of properties
 * @param <P> Parameters from command line
 */
public abstract class PropertiesBuilder<T extends Properties, P extends Params> {

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

    public static final String TARGET = "target";

    public static final String SOURCES = "sources";

    public static final String SOURCEDIRS = "sourceDirs";

    public static final String SOURCEBRANCHES = "sourceBranches";

    public static final String LABELS = "labels";

    private Map<String, Object> configFileParams;
    private Map<String, Object> identityFileParams;
    private P params;

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
        this.throwErrorIfNeeded(this.checkProperties(props), RESOURCE_BUNDLE.getString("error.configuration_file_is_invalid"));
        return props;
    }

    private void throwErrorIfNeeded(List<String> errors, String text) {
        if (errors != null && !errors.isEmpty()) {
            String errorsInOne = errors.stream()
                .map(error -> String.format(RESOURCE_BUNDLE.getString("message.item_list"), error))
                .collect(Collectors.joining("\n"));
            throw new RuntimeException(text + "\n" + errorsInOne);
        }
    }

    protected abstract T getEmptyInstance();

    protected abstract void populateWithIdentityFileParams(T props, @NonNull Map<String, Object> identityFileParams);

    protected abstract void populateWithConfigFileParams(T props, @NonNull Map<String, Object> configFileParams);

    protected abstract List<String> checkArgParams(@NonNull P params);

    protected abstract void populateWithArgParams(T props, @NonNull P params);

    protected abstract void populateWithDefaultValues(T props);

    protected abstract List<String> checkProperties(T props);

    protected static <V> void setEnvOrPropertyIfExists(Consumer<String> setter, Map<String, Object> properties, String envKey, String key) {
        String param = properties.containsKey(envKey)
            ? System.getenv(properties.get(envKey).toString())
            : (properties.containsKey(key))
            ? (properties.get(key) != null) ? properties.get(key).toString() : null
            : null;
        if (param != null) {
            setter.accept(param);
        }
    }

    protected static void setBooleanPropertyIfExists(Consumer<Boolean> setter, Map<String, Object> properties, String key) {
        Boolean param = properties.containsKey(key)
            ? properties.get(key).toString().equals("1")
            ? Boolean.TRUE
            : Boolean.valueOf(properties.get(key).toString())
            : null;
        if (param != null) {
            setter.accept(param);
        }
    }

    protected static <T> void setPropertyIfExists(Consumer<T> setter, Map<String, Object> properties, String key) {
        try {
            T param = (T) properties.getOrDefault(key, null);
            if (param != null) {
                setter.accept(param);
            }
        } catch (ClassCastException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.cast_param"), key), e);
        }
    }

    protected static boolean checkBaseUrl(String baseUrl) {
        return baseUrl == null || baseUrl.matches("^(https://(.+\\.)?|http://(.+\\.)?.+\\.dev\\.)crowdin\\.com(/api/v2)?$");
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




}
