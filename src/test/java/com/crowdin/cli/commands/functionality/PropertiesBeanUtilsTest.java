package com.crowdin.cli.commands.functionality;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.params.provider.Arguments.arguments;

public class PropertiesBeanUtilsTest {

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
    public void testGetUpdateOption(String updateOption, Optional<String> expected) {
        Optional<String> result = PropertiesBeanUtils.getUpdateOption(updateOption);
        assertEquals(expected, result, "Wrong result with source pattern: " + updateOption);
    }

    private static Stream<Arguments> testGetUpdateOption() {
        return Stream.of(
            arguments("update_as_unapproved", Optional.of("keep_translations")),
            arguments("update_without_changes", Optional.of("keep_translations_and_approvals")),
            arguments("", Optional.empty()),
            arguments("nonsense", Optional.empty())
        );
    }
}
