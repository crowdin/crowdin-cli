package com.crowdin.cli.commands.actions;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.CrowdinProjectInfo;
import com.crowdin.cli.client.LanguageMapping;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.languages.model.Language;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

public class ListLanguagesActionTest {

    ProjectClient client;
    CrowdinProjectInfo projectInfo;
    Outputter out;
    ProjectProperties properties;

    @BeforeEach
    public void setup() {
        client = mock(ProjectClient.class);
        projectInfo = mock(CrowdinProjectInfo.class);
        out = mock(Outputter.class);
        properties = mock(ProjectProperties.class);

        LanguageMapping langMapping = new LanguageMapping() {
            @Override
            public String getValueOrDefault(String languageId, String placeholder, String defaultValue) {
                return defaultValue;
            }
        };

        when(client.downloadProjectInfo()).thenReturn(projectInfo);
        when(projectInfo.isManagerAccess()).thenReturn(true);
        when(projectInfo.getLanguageMapping()).thenReturn(langMapping);
    }


    @Test
    public void testActWithNoManagerAccess() {
        when(projectInfo.isManagerAccess()).thenReturn(false);
        ListLanguagesAction action = new ListLanguagesAction(BaseCli.LanguageCode.id, false, false);
        action.act(out, properties, client);
        verify(out, times(2)).println(anyString());
    }

    @Test
    public void testActPrintLanguagesPlainView() {
        Language lang = new Language();
        lang.setName("English");
        lang.setId("en");
        lang.setTwoLettersCode("en");
        when(projectInfo.getProjectLanguages(true)).thenReturn(Collections.singletonList(lang));

        ListLanguagesAction action = new ListLanguagesAction(BaseCli.LanguageCode.id, false, true);
        action.act(out, properties, client);
        verify(out).println("en");
    }

    @Test
    public void testActPrintLanguagesWithThreeLettersCode() {
        Language lang = new Language();
        lang.setThreeLettersCode("eng");
        when(projectInfo.getProjectLanguages(true)).thenReturn(Collections.singletonList(lang));

        ListLanguagesAction action = new ListLanguagesAction(BaseCli.LanguageCode.three_letters_code, false, false);
        action.act(out, properties, client);
        verify(out).println(contains("eng"));
    }

    @Test
    public void testActPrintLanguagesWithAndroidCode() {
        Language lang = new Language();
        lang.setAndroidCode("en-rUS");
        when(projectInfo.getProjectLanguages(true)).thenReturn(Collections.singletonList(lang));

        ListLanguagesAction action = new ListLanguagesAction(BaseCli.LanguageCode.android_code, false, false);
        action.act(out, properties, client);
        verify(out).println(contains("en-rUS"));
    }

    @Test
    public void testActPrintLanguagesWithOsxCode() {
        Language lang = new Language();
        lang.setOsxCode("en");
        when(projectInfo.getProjectLanguages(true)).thenReturn(Collections.singletonList(lang));

        ListLanguagesAction action = new ListLanguagesAction(BaseCli.LanguageCode.osx_code, false, false);
        action.act(out, properties, client);
        verify(out).println(contains("en"));
    }

    @Test
    public void testActPrintLanguagesWithOsxLocale() {
        Language lang = new Language();
        lang.setOsxLocale("en_US");
        when(projectInfo.getProjectLanguages(true)).thenReturn(Collections.singletonList(lang));

        ListLanguagesAction action = new ListLanguagesAction(BaseCli.LanguageCode.osx_locale, false, false);
        action.act(out, properties, client);
        verify(out).println(contains("en_US"));
    }

    @Test
    public void testActPrintLanguagesWithLocale() {
        Language lang = new Language();
        lang.setLocale("en_US");
        when(projectInfo.getProjectLanguages(true)).thenReturn(Collections.singletonList(lang));

        ListLanguagesAction action = new ListLanguagesAction(BaseCli.LanguageCode.locale, false, false);
        action.act(out, properties, client);
        verify(out).println(contains("en_US"));
    }

    @Test
    public void testActWithoutManagerAccessPlainView() {
        when(projectInfo.isManagerAccess()).thenReturn(false);

        ListLanguagesAction action = new ListLanguagesAction(BaseCli.LanguageCode.id, false, true);
        assertThrows(RuntimeException.class, () -> action.act(out, properties, client));
    }

    @Test
    public void testActPrintLanguagesWithNullCode() {
        Language lang = new Language();
        lang.setName("English");
        lang.setTwoLettersCode("en");
        when(projectInfo.getProjectLanguages(true)).thenReturn(Collections.singletonList(lang));

        ListLanguagesAction action = new ListLanguagesAction(null, false, false);
        action.act(out, properties, client);

        verify(out, times(1)).println("✔️  Fetching project info");
        verify(out, times(1)).println("✔️  English @|bold 'en'|@");
    }
}
