package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.models.SourceStringBuilder;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NewProjectPropertiesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcestrings.model.SourceString;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.mockito.Mockito.*;

public class ContextStatusActionTest {

    @Test
    public void testContextStatus() {
        ProjectProperties pb = NewProjectPropertiesUtilBuilder.minimalBuilt().build();

        // Build project with one file (id=101)
        var projectFull = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.txt", "plain", 101L, null, null, "/%original_file_name%")
                .build();
        projectFull.setType(Type.FILES_BASED);

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null)).thenReturn(projectFull);
        when(client.listLabels()).thenReturn(List.of());

        SourceString ss = SourceStringBuilder.standard()
                .setProjectId(Long.parseLong(pb.getProjectId()))
                .setIdentifiers(701L, "the-text", "manual\n\n✨ AI Context\nai-content\n✨ 🔚", "the.key", 101L)
                .build();

        when(client.listSourceString(null, null, null, null, null, null, null))
                .thenReturn(Arrays.asList(ss));

        ContextStatusAction action = new ContextStatusAction(
                null,
                null,
                null,
                null,
                null,
                true,
                false,
                false
        );

        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).listLabels();
        verify(client).listSourceString(null, null, null, null, null, null, null);
    }
}
