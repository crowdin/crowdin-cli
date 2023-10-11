package com.crowdin.cli.commands.actions;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.CrowdinProjectInfo;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.languages.model.Language;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

public class ListLanguagesActionTest {

    ProjectClient client;
    CrowdinProjectInfo projectInfo;
    Outputter out;
    ProjectProperties properties;
    ListLanguagesAction action;

    @BeforeEach
    public void setup() {
        client = mock(ProjectClient.class);
        projectInfo = mock(CrowdinProjectInfo.class);
        out = mock(Outputter.class);
        properties = mock(ProjectProperties.class);

        when(client.downloadProjectInfo()).thenReturn(projectInfo);
        when(projectInfo.isManagerAccess()).thenReturn(true);
    }

    @Test
    public void testActWithNoManagerAccess() {
        when(client.downloadProjectInfo()).thenReturn(projectInfo);
        when(projectInfo.isManagerAccess()).thenReturn(false);

        action = new ListLanguagesAction(BaseCli.LanguageCode.id, false, false);
        action.act(out, properties, client);

        verify(out, times(2)).println(anyString());
    }

    @Test
    public void testActWithPlainViewNoManagerAccess() {
        when(client.downloadProjectInfo()).thenReturn(projectInfo);
        when(projectInfo.isManagerAccess()).thenReturn(false);

        action = new ListLanguagesAction(BaseCli.LanguageCode.id, false, true);

        assertThrows(RuntimeException.class, () -> action.act(out, properties, client));
    }


    @Test
    public void testActPrintLanguages() {
        when(client.downloadProjectInfo()).thenReturn(projectInfo);
        when(projectInfo.isManagerAccess()).thenReturn(true);
        when(projectInfo.getProjectLanguages(true)).thenReturn(Collections.singletonList(new Language() {{
            setName("name");
            setTwoLettersCode("code");
        }}));

        action = new ListLanguagesAction(BaseCli.LanguageCode.id, false, false);
        action.act(out, properties, client);

        verify(out, times(2)).println(anyString());
    }
}
