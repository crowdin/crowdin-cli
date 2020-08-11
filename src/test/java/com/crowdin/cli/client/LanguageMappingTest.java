package com.crowdin.cli.client;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class LanguageMappingTest {

    private static final Map<String, Map<String, String>> SERVER_LANGUAGE_MAPPING =
        new HashMap<String, Map<String, String>>() {{
                put("uk", new HashMap<String, String>() {{
                        put("name", "Ukrainian");
                        put("two_letters_code", "ua");
                    }}
                );
            }};
    private static final Map<String, Map<String, String>> CONFIG_FILE_LANGUAGE_MAPPING =
        new HashMap<String, Map<String, String>>() {{
                put("three_letters_code", new HashMap<String, String>() {{
                        put("uk", "ua");
                    }}
                );
                put("name", new HashMap<String, String>() {{
                        put("uk", "_Ukrainian_");
                    }}
                );
            }};

    @Test
    public void testLanguageMappingForServer() {
        LanguageMapping result = LanguageMapping.fromServerLanguageMapping(SERVER_LANGUAGE_MAPPING);

        assertTrue(result.containsValue("uk", "name"));
        assertTrue(result.containsValue("uk", "two_letters_code"));
    }

    @Test
    public void testLanguageMappingForConfigFile() {
        LanguageMapping result = LanguageMapping.fromConfigFileLanguageMapping(CONFIG_FILE_LANGUAGE_MAPPING);

        assertTrue(result.containsValue("uk", "name"));
        assertTrue(result.containsValue("uk", "three_letters_code"));
    }

    @Test
    public void testPopulate() {
        LanguageMapping serverLanguageMapping = LanguageMapping.fromServerLanguageMapping(SERVER_LANGUAGE_MAPPING);
        LanguageMapping configFileLanguageMapping = LanguageMapping.fromConfigFileLanguageMapping(CONFIG_FILE_LANGUAGE_MAPPING);
        LanguageMapping result = LanguageMapping.populate(configFileLanguageMapping, serverLanguageMapping);

        assertTrue(result.containsValue("uk", "name"));
        assertTrue(result.containsValue("uk", "two_letters_code"));
        assertTrue(result.containsValue("uk", "three_letters_code"));
        assertEquals(CONFIG_FILE_LANGUAGE_MAPPING.get("name").get("uk"), result.getValue("uk", "name"));
    }
}
