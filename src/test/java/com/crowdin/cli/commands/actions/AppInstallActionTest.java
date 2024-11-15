package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

public class AppInstallActionTest {

    Outputter out = Outputter.getDefault();
    PropertiesWithFiles pb;

    ProjectClient clientMock = mock(ProjectClient.class);
    NewAction<ProjectProperties, ProjectClient> action;

    @Test
    public void testInstall() {
        String id = "test";
        String url = "test.com/manifest.json";
        when(clientMock.findManifestUrl(id)).thenReturn(Optional.of(url));
        doNothing().when(clientMock).installApplication(url);

        action = new AppInstallAction(id);
        action.act(out, pb, clientMock);

        verify(clientMock).findManifestUrl(id);
        verify(clientMock).installApplication(url);
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void testInstallFailed() {
        String id = "test";
        when(clientMock.findManifestUrl(id)).thenReturn(Optional.empty());

        action = new AppInstallAction(id);
        assertThrows(ExitCodeExceptionMapper.NotFoundException.class, () -> action.act(out, pb, clientMock));

        verify(clientMock).findManifestUrl(id);
        verifyNoMoreInteractions(clientMock);
    }
}
