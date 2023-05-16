package com.crowdin.cli.utils;

import com.crowdin.cli.client.LanguageMapping;
import com.crowdin.client.languages.model.Language;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import static com.crowdin.cli.utils.AssertUtils.assertPathsEqualIgnoringSeparator;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;

public class PlaceholderUtilTest {

    @ParameterizedTest
    @MethodSource
    public void testMainFunctionality(
        Language[] supportedLangs,
        Language[] projectLangs,
        File[] sources,
        String toFormat,
        String[] expected
    ) {
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(
            Arrays.asList(supportedLangs),
            Arrays.asList(projectLangs),
            "/proj/path/"
        );

        Set<String> result = placeholderUtil.format(Arrays.asList(sources), toFormat, true);

        assertEquals(new HashSet<>(Arrays.asList(expected)), result);
    }

    static Stream<Arguments> testMainFunctionality() {
        return Stream.of(
            arguments(
                new Language[] {LanguageBuilder.UKR.build(), LanguageBuilder.RUS.build()},
                new Language[] {LanguageBuilder.UKR.build(), LanguageBuilder.RUS.build()},
                new File[] {new File("resources/messages.xml")},
                Utils.normalizePath("resources/%two_letters_code%_%original_file_name%"),
                new String[] {Utils.normalizePath("resources/ua_messages.xml"), Utils.normalizePath("resources/ru_messages.xml")}
            ),
            arguments(// Must be only de_messages
                new Language[] { LanguageBuilder.DEU.build(), LanguageBuilder.ENG.build() },
                new Language[] { LanguageBuilder.DEU.build() },
                new File[] {new File("resources/messages.xml")},
                Utils.normalizePath("resources/%two_letters_code%_%original_file_name%"),
                new String[] {Utils.normalizePath("resources/de_messages.xml")}
            ),
            arguments(// How to treat double asterisks
                new Language[] {LanguageBuilder.ENG.build()},
                new Language[] {LanguageBuilder.ENG.build()},
                new File[] {new File("resources/messages.xml")},
                Utils.normalizePath("/**/%two_letters_code%_%original_file_name%"),
                new String[] {Utils.normalizePath("resources/en_messages.xml")}
            )
        );
    }

    @ParameterizedTest
    @MethodSource
    public void testMainFunctionalityWithLists(
        Language[] supportedLangs,
        Language[] projectLangs,
        File[] sources,
        String[] toFormat,
        String[] expected
    ) {
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(
            Arrays.asList(supportedLangs),
            Arrays.asList(projectLangs),
            "/proj/path/"
        );

        List<String> result = placeholderUtil.format(Arrays.asList(sources), Arrays.asList(toFormat), true);

        assertEquals(new HashSet<>(Arrays.asList(expected)), new HashSet<>(result));
    }

    static Stream<Arguments> testMainFunctionalityWithLists() {
        return Stream.of(
            arguments(
                new Language[] {LanguageBuilder.UKR.build(), LanguageBuilder.RUS.build()},
                new Language[] {LanguageBuilder.UKR.build(), LanguageBuilder.RUS.build()},
                new File[] {new File("resources/messages.xml")},
                new String[] {
                    Utils.normalizePath("/**/%two_letters_code%_%original_file_name%"),
                    Utils.normalizePath("/**/%three_letters_code%_%original_file_name%")
                },
                new String[] {
                    Utils.normalizePath("resources/ua_messages.xml"),
                    Utils.normalizePath("resources/ru_messages.xml"),
                    Utils.normalizePath("resources/rus_messages.xml"),
                    Utils.normalizePath("resources/ukr_messages.xml")
                }
            )
        );
    }

    @Test
    public void testForNpe() {
        assertThrows(NullPointerException.class, () -> new PlaceholderUtil(null, null, null));
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(new ArrayList<>(), new ArrayList<>(), "/here/it/goes/");

        assertEquals(new ArrayList<String>(), placeholderUtil.format(null, new ArrayList<>(), false));
        assertEquals(new HashSet<>(), placeholderUtil.format(null, "", false));

        assertThrows(NullPointerException.class, () -> placeholderUtil.replaceLanguageDependentPlaceholders(null, new Language()));
        assertThrows(NullPointerException.class, () -> placeholderUtil.replaceLanguageDependentPlaceholders(null, null, null));
        assertThrows(NullPointerException.class, () -> placeholderUtil.replaceFileDependentPlaceholders(null, null));
    }

    @Test
    public void testReplaceLanguageDependentPlaceholders() {
        String toFormat = "/path/to/%two_letters_code%/file.txt";
        List<String> expected = new ArrayList<String>() {{
                add("/path/to/ru/file.txt");
                add("/path/to/ua/file.txt");
            }};
        List<Language> langs = Arrays.asList(LanguageBuilder.RUS.build(), LanguageBuilder.UKR.build());
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(langs, langs, "");
        List<String> result = placeholderUtil.replaceLanguageDependentPlaceholders(toFormat, LanguageMapping.fromServerLanguageMapping(null));
        assertEquals(expected, result);
    }

    @ParameterizedTest
    @MethodSource
    public void testDoubleAsteriskInWildCard(String source, File crowdinFile, String expected) {
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(new ArrayList<>(), new ArrayList<>(), "./");
        assertPathsEqualIgnoringSeparator(expected, placeholderUtil.replaceFileDependentPlaceholders(source, crowdinFile));
    }

    static Stream<Arguments> testDoubleAsteriskInWildCard() {
        return Stream.of(
                arguments("folder1/folder2/**/messages.properties",
                    new File("folder_on_crowdin/folder1/folder2/folder3/folder4/messages.properties"),
                    "folder1/folder2/folder3/folder4/messages.properties"
                ),
                arguments("folder/**/*.xml",
                    new File("files/folder/sub/1.xml"),
                    "folder/sub/*.xml"
                )
        );
    }

    @Test
    public void testReplaceLanguageDependentPlaceholdersLang() {
        String toFormat = "path/to/%two_letters_code%/%language%/%file_name%";
        Language language = LanguageBuilder.UKR.build();
        LanguageMapping languageMapping = LanguageMapping.fromServerLanguageMapping(new HashMap<String, Map<String, String>>() {{
                put("ua", new HashMap<String, String>() {{
                        put("two_letters_code", "UA");
                    }}
                );
            }}
        );
        String expected = "path/to/UA/Ukrainian/%file_name%";
        List<Language> suppLangs =
            Arrays.asList(LanguageBuilder.RUS.build(), LanguageBuilder.UKR.build(), LanguageBuilder.ENG.build(), LanguageBuilder.DEU.build());
        List<Language> projLangs = Arrays.asList(LanguageBuilder.RUS.build(), LanguageBuilder.UKR.build());
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(suppLangs, projLangs, "");
        String result = placeholderUtil.replaceLanguageDependentPlaceholders(toFormat, languageMapping, language);
        assertEquals(expected, result);
    }
}
