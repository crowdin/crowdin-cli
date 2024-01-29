package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.client.CrowdinProjectInfo;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.distributions.model.DistributionRelease;
import com.crowdin.client.distributions.model.DistributionStringsBasedRelease;
import com.crowdin.client.projectsgroups.model.Type;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

public class DistributionReleaseActionTest {
    private final static String HASH = "distribution";
    private NewAction<ProjectProperties, ClientDistribution> action;

    @Test
    public void releaseDistributionTest_whenSuccess() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ClientDistribution client = mock(ClientDistribution.class);
        ProjectClient projectClient = mock(ProjectClient.class);
        CrowdinProjectInfo projectInfo = mock(CrowdinProjectInfo.class);
        when(projectInfo.getType())
            .thenReturn(Type.FILES_BASED);
        when(projectClient.downloadProjectInfo())
            .thenReturn(projectInfo);
        DistributionRelease distributionRelease = new DistributionRelease();
        distributionRelease.setStatus("success");
        when(client.release(HASH)).thenReturn(distributionRelease);

        action = new DistributionReleaseAction(true, true, HASH, projectClient);
        action.act(Outputter.getDefault(), pb, client);
        verify(client).release(HASH);
    }

    @Test
    public void releaseDistributionTest_whenFailed() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ClientDistribution client = mock(ClientDistribution.class);
        ProjectClient projectClient = mock(ProjectClient.class);
        CrowdinProjectInfo projectInfo = mock(CrowdinProjectInfo.class);
        when(projectInfo.getType())
            .thenReturn(Type.FILES_BASED);
        when(projectClient.downloadProjectInfo())
            .thenReturn(projectInfo);
        DistributionRelease distributionRelease = new DistributionRelease();
        distributionRelease.setStatus("failed");
        when(client.release(any())).thenReturn(distributionRelease);
        when(client.getDistributionRelease(eq(HASH))).thenReturn(distributionRelease);

        action = new DistributionReleaseAction(true, true, HASH, projectClient);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));
        verify(client).release(HASH);
        verify(client).getDistributionRelease(HASH);
    }

    @Test
    public void releaseDistributionTest_StringsBasedProject() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ClientDistribution client = mock(ClientDistribution.class);
        ProjectClient projectClient = mock(ProjectClient.class);
        CrowdinProjectInfo projectInfo = mock(CrowdinProjectInfo.class);
        when(projectInfo.getType())
            .thenReturn(Type.STRINGS_BASED);
        when(projectClient.downloadProjectInfo())
            .thenReturn(projectInfo);
        DistributionStringsBasedRelease distributionRelease = new DistributionStringsBasedRelease();
        distributionRelease.setStatus("success");
        when(client.releaseStringsBased(HASH)).thenReturn(distributionRelease);

        action = new DistributionReleaseAction(true, true, HASH, projectClient);
        action.act(Outputter.getDefault(), pb, client);
        verify(client).releaseStringsBased(HASH);
    }
}
