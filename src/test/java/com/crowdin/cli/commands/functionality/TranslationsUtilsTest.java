package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.Utils;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.params.provider.Arguments.arguments;

public class TranslationsUtilsTest {

    @ParameterizedTest
    @MethodSource
    public void testReplaceDoubleAsterisk(String sourcePattern, String translationPattern, String sourceFile, String expected) {
        String result = TranslationsUtils.replaceDoubleAsterisk(sourcePattern, translationPattern, sourceFile);
        assertEquals(expected, result, String.format("SourcePat: %s TranslationPat: %s SourceFile: %s", sourcePattern, translationPattern, sourceFile));
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
                Utils.normalizePath("/%two_letters_code%/here/%original_file_name%"))
        );
    }

    @ParameterizedTest
    @MethodSource
    public void testPopulateLanguageMappingFromServer(Map<String, Map<String, String>> projectMapping, Map<String, Map<String, String>> serverMapping, Map<String, Map<String, String>> expected) {
        TranslationsUtils.populateLanguageMappingFromServer(projectMapping, serverMapping);
        assertEquals(expected, projectMapping, "Maps is not equal");
    }

    static Stream<Arguments> testPopulateLanguageMappingFromServer() {
        return Stream.of(
                arguments(
                    new HashMap<String, Map<String, String>>() {{
                        put("two_letters_code", new HashMap<String, String>() {{
                            put("zh", "zh_CN");
                            put("fr", "fr_");
                        }});
                    }},
                    new HashMap<>(),
                    new HashMap<String, Map<String, String>>() {{
                        put("two_letters_code", new HashMap<String, String>() {{
                            put("zh", "zh_CN");
                            put("fr", "fr_");
                        }});
                    }}
                ),
                arguments(
                    new HashMap<String, Map<String, String>>() {{
                        put("two_letters_code", new HashMap<String, String>() {{
                            put("zh", "zh_CN");
                            put("fr", "fr_");
                        }});
                    }},
                    new HashMap<String, Map<String, String>>() {{
                        put("ua", new HashMap<String, String>() {{
                            put("two_letters_code", "ua_");
                        }});
                    }},
                    new HashMap<String, Map<String, String>>() {{
                        put("two_letters_code", new HashMap<String, String>() {{
                            put("zh", "zh_CN");
                            put("fr", "fr_");
                            put("ua", "ua_");
                        }});
                    }}
                ),
                arguments(
                    new HashMap<String, Map<String, String>>() {{
                        put("two_letters_code", new HashMap<String, String>() {{
                            put("zh", "zh_CN");
                            put("fr", "fr_");
                        }});
                    }},
                    new HashMap<String, Map<String, String>>() {{
                        put("ua", new HashMap<String, String>() {{
                            put("name", "ua_");
                        }});
                    }},
                    new HashMap<String, Map<String, String>>() {{
                        put("two_letters_code", new HashMap<String, String>() {{
                            put("zh", "zh_CN");
                            put("fr", "fr_");
                        }});
                        put("language", new HashMap<String, String>() {{
                            put("ua", "ua_");
                        }});
                    }}
                ),
                arguments(
                    new HashMap<String, Map<String, String>>() {{
                        put("two_letters_code", new HashMap<String, String>() {{
                            put("zh", "zh_CN");
                            put("fr", "fr_");
                        }});
                    }},
                    new HashMap<String, Map<String, String>>() {{
                        put("fr", new HashMap<String, String>() {{
                            put("two_letters_code", "fr_FR");
                        }});
                    }},
                    new HashMap<String, Map<String, String>>() {{
                        put("two_letters_code", new HashMap<String, String>() {{
                            put("zh", "zh_CN");
                            put("fr", "fr_");
                        }});
                    }}
                )
        );
    }
}
