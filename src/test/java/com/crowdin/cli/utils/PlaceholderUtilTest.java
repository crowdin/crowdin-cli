package com.crowdin.cli.utils;

import com.crowdin.cli.properties.helper.FileHelper;
import com.crowdin.common.models.Language;
import org.apache.commons.io.FilenameUtils;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.File;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.params.provider.Arguments.arguments;

public class PlaceholderUtilTest {

    @ParameterizedTest
    @MethodSource
    public void testMainFunctionality(Language[] supportedLangs,
                                      Language[] projectLangs,
                                      File[] sources,
                                      String toFormat,
                                      String[] expected) {
        PlaceholderUtil placeholderUtil =
                new PlaceholderUtil(Arrays.asList(supportedLangs), Arrays.asList(projectLangs), "/proj/path/");
        List<String> result = placeholderUtil.format(Arrays.asList(sources), toFormat, true);
        assertEquals(Arrays.asList(expected), result);
    }

    static Stream<Arguments> testMainFunctionality() {
        return Stream.of(
                arguments(
                        new Language[] {LanguageBuilder.UKR.build(), LanguageBuilder.RUS.build()},
                        new Language[] {LanguageBuilder.UKR.build(), LanguageBuilder.RUS.build()},
                        new File[] {new File("resources/messages.xml")},
                        "resources/%two_letters_code%_%original_file_name%",
                        new String[] {"/proj/path/resources/ua_messages.xml", "/proj/path/resources/ru_messages.xml"}),
                arguments( // Must be only de_messages
                        new Language[] {LanguageBuilder.DEU.build(), LanguageBuilder.ENG.build()},
                        new Language[] {LanguageBuilder.DEU.build()},
                        new File[] {new File("resources/messages.xml")},
                        "resources/%two_letters_code%_%original_file_name%",
                        new String[] {"/proj/path/resources/de_messages.xml"}),
                arguments( // How to treat double asterisks
                        new Language[] {LanguageBuilder.ENG.build()},
                        new Language[] {LanguageBuilder.ENG.build()},
                        new File[] {new File("resources/messages.xml")},
                        "/**/%two_letters_code%_%original_file_name%",
                        new String[] {"/proj/path/resources/en_messages.xml"})
        );
    }

    @ParameterizedTest
    @MethodSource
    public void testMainFunctionalityWithLists(Language[] supportedLangs,
                                      Language[] projectLangs,
                                      File[] sources,
                                      String[] toFormat,
                                      String[] expected) {
        PlaceholderUtil placeholderUtil =
                new PlaceholderUtil(Arrays.asList(supportedLangs), Arrays.asList(projectLangs), "/proj/path/");
        List<String> result = placeholderUtil.format(Arrays.asList(sources), Arrays.asList(toFormat), true);
        assertEquals(Arrays.asList(expected), result);
    }

    static Stream<Arguments> testMainFunctionalityWithLists() {
        return Stream.of(
                arguments(
                        new Language[] {LanguageBuilder.UKR.build(), LanguageBuilder.RUS.build()},
                        new Language[] {LanguageBuilder.UKR.build(), LanguageBuilder.RUS.build()},
                        new File[] {new File("resources/messages.xml")},
                        new String[] {"/**/%two_letters_code%_%original_file_name%",
                                "/**/%three_letters_code%_%original_file_name%"},
                        new String[] {"/proj/path/resources/ua_messages.xml",
                                "/proj/path/resources/ru_messages.xml",
                                "/proj/path/resources/ukr_messages.xml",
                                "/proj/path/resources/rus_messages.xml"})
        );
    }

}
