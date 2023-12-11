package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.Utils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;

public class TranslationsUtilsTest {

    @ParameterizedTest
    @MethodSource
    public void testReplaceDoubleAsterisk(String sourcePattern, String translationPattern, String sourceFile, String expected) {
        String result = TranslationsUtils.replaceDoubleAsterisk(sourcePattern, translationPattern, sourceFile);
        assertEquals(expected, result,
            String.format("SourcePat: %s TranslationPat: %s SourceFile: %s", sourcePattern, translationPattern, sourceFile));
    }

    static Stream<Arguments> testReplaceDoubleAsterisk() {
        return Stream.of(
            arguments(
                Utils.normalizePath("/folder/**/*.txt"),
                Utils.normalizePath("/f/**/%original_file_name%"),
                Utils.normalizePath("folder/folder2/folder3/file.txt"),
                Utils.normalizePath("/f/folder2/folder3/%original_file_name%")),
            arguments(
                Utils.normalizePath("/folder/folder2/**/*.txt"),
                Utils.normalizePath("/f/**/%original_file_name%"),
                Utils.normalizePath("folder/folder2/folder3/file.txt"),
                Utils.normalizePath("/f/folder3/%original_file_name%")),
            arguments(
                Utils.normalizePath("/f1/**/*.*"),
                Utils.normalizePath("/%locale%/%original_file_name%"),
                Utils.normalizePath("f1/android.xml"),
                Utils.normalizePath("/%locale%/%original_file_name%")),
            arguments(
                Utils.normalizePath("/folder1/folder2/**/messages.properties"),
                Utils.normalizePath("/folder1/folder2/**/%file_name%_%two_letters_code%.properties"),
                Utils.normalizePath("/folder_on_crowdin/folder1/folder2/folder3/folder4/messages.properties"),
                Utils.normalizePath("/folder1/folder2/folder3/folder4/%file_name%_%two_letters_code%.properties")),
            arguments(
                Utils.normalizePath("/home/daanya/Documents/**/*.txt"),
                Utils.normalizePath("/**/%locale%/%original_file_name%"),
                Utils.normalizePath("/home/daanya/Documents/here/and/there/file.txt"),
                Utils.normalizePath("/here/and/there/%locale%/%original_file_name%")),
            arguments(
                Utils.normalizePath("/folder/**/*.txt"),
                Utils.normalizePath("/**/%locale%/%original_file_name%"),
                Utils.normalizePath("folder/folder2/file.txt"),
                Utils.normalizePath("/folder2/%locale%/%original_file_name%")),
            arguments(
                Utils.normalizePath("/en/**/*.po"),
                Utils.normalizePath("/%two_letters_code%/**/%original_file_name%"),
                Utils.normalizePath("en/here/file.po"),
                Utils.normalizePath("/%two_letters_code%/here/%original_file_name%")),
            arguments(
                Utils.normalizePath("/*/**/*.po"),
                Utils.normalizePath("/%two_letters_code%/**/%original_file_name%"),
                Utils.normalizePath("hmm/here/file.po"),
                Utils.normalizePath("/%two_letters_code%/hmm/here/%original_file_name%")),
            arguments(
                Utils.normalizePath("/english/**/*.yml"),
                Utils.normalizePath("/%language%/**/%file_name%_l_%language%.%file_extension%"),
                Utils.normalizePath("english/folder/messages_l_english.yml"),
                Utils.normalizePath("/%language%/folder/%file_name%_l_%language%.%file_extension%"))
        );
    }

    @Test
    public void testForExceptions() {
        assertThrows(RuntimeException.class,
            () -> TranslationsUtils.replaceDoubleAsterisk("*", null, null));
        assertThrows(RuntimeException.class,
            () -> TranslationsUtils.replaceDoubleAsterisk(
                "*",
                "**" + Utils.PATH_SEPARATOR + "%locale%",
                "first.po"));
    }
}
