package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.client.applications.installations.model.ApplicationInstallation;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.*;

public class AppListActionTest {

    List<ApplicationInstallation> standardList = Arrays.asList(new ApplicationInstallation(), new ApplicationInstallation());
    List<ApplicationInstallation> emptyList = Collections.emptyList();

    Outputter out = Outputter.getDefault();
    PropertiesWithFiles pb;

    ProjectClient clientMock = mock(ProjectClient.class);
    NewAction<ProjectProperties, ProjectClient> action;

    @Test
    public void test_standard() {
        when(clientMock.listApplications())
                .thenReturn(standardList);

        action = new AppListAction(false);
        action.act(out, pb, clientMock);

        verify(clientMock).listApplications();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_plainView() {
        when(clientMock.listApplications())
                .thenReturn(standardList);

        action = new AppListAction(true);
        action.act(out, pb, clientMock);

        verify(clientMock).listApplications();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList() {
        when(clientMock.listApplications())
                .thenReturn(emptyList);

        action = new AppListAction(false);
        action.act(out, pb, clientMock);

        verify(clientMock).listApplications();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList_plainView() {
        when(clientMock.listApplications())
                .thenReturn(emptyList);

        action = new AppListAction(true);
        action.act(out, pb, clientMock);

        verify(clientMock).listApplications();
        verifyNoMoreInteractions(clientMock);
    }
}
