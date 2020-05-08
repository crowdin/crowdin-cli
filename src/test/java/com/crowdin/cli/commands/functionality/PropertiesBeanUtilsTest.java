package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcefiles.model.UpdateOption;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.params.provider.Arguments.arguments;

public class PropertiesBeanUtilsTest {

    @Test
    public void testConstructor() {
        assertDoesNotThrow(PropertiesBeanUtils::new);
    }
    @ParameterizedTest
    @MethodSource
    public void testGetSchemeObject(String updateOption, Map<String, Integer> expected) {
        Map<String, Integer> result = PropertiesBeanUtils.getSchemeObject(updateOption);
        assertEquals(expected.size(), result.size(), "Sizes of map is not equal for updateOption: " + updateOption);
        assertEquals(expected, result, "Maps is not equal for updateOption: " + updateOption);
    }

    private static Stream<Arguments> testGetSchemeObject() {
        return Stream.of(
            arguments("identifier,source_phrase,translation,context", new HashMap<String, Integer>() {{
                put("identifier", 0);
                put("source_phrase", 1);
                put("translation", 2);
                put("context", 3);
            }}),
            arguments("identifier,source_phrase,translation,context,max_length", new HashMap<String, Integer>() {{
                put("identifier", 0);
                put("source_phrase", 1);
                put("translation", 2);
                put("context", 3);
                put("max_length", 4);
            }}),
            arguments("identifier,source_phrase,context,uk,ru,fr", new HashMap<String, Integer>() {{
                put("identifier", 0);
                put("source_phrase", 1);
                put("context", 2);
                put("uk", 3);
                put("ru", 4);
                put("fr", 5);
            }}),
            arguments("", new HashMap<>()),
            arguments(null, new HashMap<>()),
            arguments("identifier", new HashMap<String, Integer>() {{
                put("identifier", 0);
            }})
        );
    }

    @ParameterizedTest
    @MethodSource
    public void testGetUpdateOption(String updateOption, Optional<UpdateOption> expected) {
        Optional<UpdateOption> result = PropertiesBeanUtils.getUpdateOption(updateOption);
        assertEquals(expected, result, "Wrong result with source pattern: " + updateOption);
    }

    private static Stream<Arguments> testGetUpdateOption() {
        return Stream.of(
            arguments("update_as_unapproved", Optional.of(UpdateOption.KEEP_TRANSLATIONS)),
            arguments("update_without_changes", Optional.of(UpdateOption.KEEP_TRANSLATIONS_AND_APPROVALS)),
            arguments("", Optional.empty()),
            arguments("nonsense", Optional.empty())
        );
    }

    @ParameterizedTest
    @MethodSource
    public void testUseTranslationReplace(String translationPath, Map<String, String> translationReplace, String expected) {
        String result = PropertiesBeanUtils.useTranslationReplace(translationPath, translationReplace);
        assertEquals(expected, result);
    }

    private static Stream<Arguments> testUseTranslationReplace() {
        return Stream.of(
            arguments(Utils.normalizePath("path/to/file.po"),
                new HashMap<String, String>() {{
                    put("path/to/", "here/");
                }},
                Utils.normalizePath("here/file.po")),
            arguments(Utils.normalizePath("path/to/file.po"),
                null,
                Utils.normalizePath("path/to/file.po"))
        );
    }

    @Test
    public void testGetOrganization() {
        assertEquals("Daanya", PropertiesBeanUtils.getOrganization("https://Daanya.crowdin.com/api/v2"));
        assertNull(PropertiesBeanUtils.getOrganization("https://crowdin.com/api/v2"));
    }
}
