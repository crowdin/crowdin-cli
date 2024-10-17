package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.projectsgroups.model.*;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.mockito.Mockito.*;

class ProjectAddActionTest {

    private ProjectClient client = mock(ProjectClient.class);
    private NewAction<ProjectProperties, ProjectClient> action;
    private ProjectProperties properties = new ProjectProperties();
    private static final String PROJECT_TITLE = "project";
    private static final List<String> TARGET_LANGUAGE = List.of("uk");

    @Test
    public void testProjectAdd_FileBased() {
        properties.setBaseUrl("crowdin.com");
        Project project = new Project();
        project.setName(PROJECT_TITLE);
        project.setId(1L);

        FilesBasedProjectRequest request = new FilesBasedProjectRequest();
        request.setName(PROJECT_TITLE);
        request.setTargetLanguageIds(TARGET_LANGUAGE);
        request.setSourceLanguageId("en");
        request.setVisibility("PRIVATE");

        when(client.addProject(request)).thenReturn(project);

        action = new ProjectAddAction(PROJECT_TITLE, false, null, TARGET_LANGUAGE, false, false);
        action.act(Outputter.getDefault(), properties, client);

        verify(client).addProject(request);
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testProjectAdd_StringBased() {
        properties.setBaseUrl("crowdin.com");
        Project project = new Project();
        project.setName(PROJECT_TITLE);
        project.setId(1L);

        StringsBasedProjectRequest request = new StringsBasedProjectRequest();
        request.setName(PROJECT_TITLE);
        request.setType(Type.STRINGS_BASED);
        request.setTargetLanguageIds(TARGET_LANGUAGE);
        request.setSourceLanguageId("fr");
        request.setVisibility("OPEN");

        when(client.addProject(request)).thenReturn(project);

        action = new ProjectAddAction(PROJECT_TITLE, true, "fr", TARGET_LANGUAGE, true, false);
        action.act(Outputter.getDefault(), properties, client);

        verify(client).addProject(request);
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testProjectAdd_Enterprise() {
        properties.setBaseUrl("companyname.crowdin.com");
        Project project = new Project();
        project.setName(PROJECT_TITLE);
        project.setId(1L);

        EnterpriseProjectRequest request = new EnterpriseProjectRequest();
        request.setName(PROJECT_TITLE);
        request.setTargetLanguageIds(TARGET_LANGUAGE);
        request.setSourceLanguageId("fr");

        when(client.addProject(request)).thenReturn(project);

        action = new ProjectAddAction(PROJECT_TITLE, false, "fr", TARGET_LANGUAGE, false, false);
        action.act(Outputter.getDefault(), properties, client);

        verify(client).addProject(request);
        verifyNoMoreInteractions(client);
    }
}
