package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.PropertiesBeanBuilder;
import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.*;

public class ListSourcesActionTest {

    static TempProject project;

    @BeforeEach
    public void createProj() {
        project = new TempProject(FileHelperTest.class);
    }

    @AfterEach
    public void deleteProj() {
        project.delete();
    }

    @Test
    public void testForServerInteraction() throws ResponseException {
        PropertiesBeanBuilder pbBuilder = new PropertiesBeanBuilder()
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesBean pb = pbBuilder.build();
        Client client = mock(Client.class);
        when(client.downloadProjectWithLanguages())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());

        Action action = new ListSourcesAction(false, false);
        action.act(pb, client);

        verify(client).downloadProjectWithLanguages();
        verifyNoMoreInteractions(client);
    }
}
