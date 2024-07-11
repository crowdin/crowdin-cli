package com.crowdin.cli.client;

import com.crowdin.client.languages.model.Language;
import com.crowdin.client.translations.model.CharTransformation;
import lombok.NonNull;
import lombok.ToString;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

import static com.crowdin.cli.utils.PlaceholderUtil.*;

@ToString
public class LanguageMapping {
    private final Map<String, Map<String, String>> languageMapping;

    protected LanguageMapping() {
        this.languageMapping = new HashMap<>();
    }

    public boolean containsValue(String langCode, String placeholder) {
        return hasMappingForLangCode(langCode) && languageMapping.get(langCode).containsKey(placeholder);
    }

    public boolean hasMappingForLangCode(String langCode) {
        return languageMapping.containsKey(langCode);
    }

    public String getValue(String langCode, String placeholder) {
        if (!this.containsValue(langCode, placeholder)) {
            return null;
        } else {
            return languageMapping.get(langCode).get(placeholder);
        }
    }

    public String getValueOrDefault(String langCode, String placeholder, String defaultValue) {
        String value = getValue(langCode, placeholder);
        return (value != null) ? value : defaultValue;
    }

    private LanguageMapping(Map<String, Map<String, String>> languageMapping) {
        this.languageMapping = languageMapping;
    }

    /**
     * Server language mapping. It has the following structure:
     * {
     *     "uk": {
     *         "name": "Ukrainian",
     *         "two_letters_code": "ua"
     *     }
     * }
     * @param serverLanguageMapping language mapping from server. May be null/empty
     * @return immutable LanguageMapping object
     */
    public static LanguageMapping fromServerLanguageMapping(Map<String, Map<String, String>> serverLanguageMapping) {
        return (serverLanguageMapping == null)
            ? new LanguageMapping()
            : new LanguageMapping(deepCopy(serverLanguageMapping));
    }

    /**
     * Language mapping from configuration file. It  has the following structure:
     * {
     *     "three_letters_code": {
     *         "uk": "ua"
     *     },
     *     "name": {
     *         "uk": "Ukrainian"
     *     }
     * }
     * @param fileLanguageMapping language mapping from configuration file. May be null/empty
     * @return immutable LanguageMapping object
     */
    public static LanguageMapping fromConfigFileLanguageMapping(Map<String, Map<String, String>> fileLanguageMapping) {
        return (fileLanguageMapping == null)
            ? new LanguageMapping()
            : new LanguageMapping(reverse(fileLanguageMapping));
    }

    public static LanguageMapping pseudoLanguageMapping(CharTransformation charTransformation, Language language) {
        String standardCode = languageCodeByCharTransformation(charTransformation);
        Map<String, Map<String, String>> languageMapping = new HashMap<>();
        Map<String, String> placeholderMapping = new HashMap<>();

        Map<String, Supplier<String>> codeMappings = Map.of(
            PLACEHOLDER_NAME_TWO_LETTERS_CODE, language::getTwoLettersCode,
            PLACEHOLDER_NAME_THREE_LETTERS_CODE, language::getThreeLettersCode,
            PLACEHOLDER_NAME_LOCALE, language::getLocale,
            PLACEHOLDER_NAME_ANDROID_CODE, language::getAndroidCode,
            PLACEHOLDER_NAME_OSX_CODE, language::getOsxCode,
            PLACEHOLDER_NAME_OSX_LOCALE, language::getOsxLocale
        );
        codeMappings.forEach((placeholder, codeSupplier) ->
            Optional.ofNullable(codeSupplier.get()).ifPresent(code ->
                placeholderMapping.put(placeholder, code)
            )
        );
        languageMapping.put(standardCode, placeholderMapping);
        return new LanguageMapping(languageMapping);
    }

    public static LanguageMapping populate(@NonNull LanguageMapping from, @NonNull LanguageMapping to) {
        Map<String, Map<String, String>> sumLangMapping = deepCopy(to.languageMapping);
        for (Map.Entry<String, Map<String, String>> entry : from.languageMapping.entrySet()) {
            sumLangMapping.putIfAbsent(entry.getKey(), new HashMap<>());
            Map<String, String> sumLangMappingValues = sumLangMapping.get(entry.getKey());
            for (Map.Entry<String, String> entryValues : entry.getValue().entrySet()) {
                sumLangMappingValues.put(entryValues.getKey(), entryValues.getValue());
            }
        }
        return new LanguageMapping(sumLangMapping);
    }

    private static Map<String, Map<String, String>> deepCopy(Map<String, Map<String, String>> toCopy) {
        Map<String, Map<String, String>> copy = new HashMap<>();
        for (Map.Entry<String, Map<String, String>> entry : toCopy.entrySet()) {
            copy.put(entry.getKey(), new HashMap<>(entry.getValue()));
        }
        return copy;
    }

    private static Map<String, Map<String, String>> reverse(Map<String, Map<String, String>> toReverse) {
        Map<String, Map<String, String>> languageMapping = new HashMap<>();
        for (Map.Entry<String, Map<String, String>> entryPlaceholder : toReverse.entrySet()) {
            for (Map.Entry<String, String> entryValues : entryPlaceholder.getValue().entrySet()) {
                languageMapping.putIfAbsent(entryValues.getKey(), new HashMap<>());
                languageMapping.get(entryValues.getKey()).put(entryPlaceholder.getKey(), entryValues.getValue());

            }
        }
        return languageMapping;
    }
}
