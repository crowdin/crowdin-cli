package com.crowdin.cli.commands.actions;

import com.crowdin.cli.MockitoUtils;
import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.client.bundles.model.Bundle;
import com.crowdin.client.bundles.model.BundleExport;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.URL;
import java.util.Optional;

import static org.mockito.Mockito.*;

public class BundleDownloadActionTest {

    TempProject project;

    @BeforeEach
    public void createProj() {
        project = new TempProject(BundleDownloadActionTest.class);
    }

    @AfterEach
    public void deleteProj() {
        project.delete();
    }

    @Test
    public void testDownloadBundle() {
        PropertiesWithFiles pb = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean(
                        "/values/strings.xml", "/values-%two_letters_code%/%original_file_name%",
                        null, "/common/%original_file_name%")
                .setBasePath(project.getBasePath())
                .build();

        Bundle bundle = new Bundle();
        bundle.setId(1L);

        BundleExport export = new BundleExport();
        export.setStatus("finished");
        ClientBundle client = mock(ClientBundle.class);

        URL urlMock = MockitoUtils.getMockUrl(getClass());

        when(client.downloadBundle(bundle.getId(), null))
                .thenReturn(urlMock);
        when(client.getBundle(bundle.getId()))
                .thenReturn(Optional.of(bundle));

        when(client.startExportingBundle(bundle.getId()))
                .thenReturn(export);

        FilesInterface files = mock(FilesInterface.class);

        NewAction<ProjectProperties, ClientBundle> action =
                new BundleDownloadAction(bundle.getId(), files, false, false, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).getBundle(bundle.getId());
        verify(client).startExportingBundle(bundle.getId());
        verify(client).downloadBundle(bundle.getId(), null);
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testDryRun() {
        PropertiesWithFiles pb = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean(
                        "/values/strings.xml", "/values-%two_letters_code%/%original_file_name%",
                        null, "/common/%original_file_name%")
                .setBasePath(project.getBasePath())
                .build();

        Bundle bundle = new Bundle();
        bundle.setId(1L);

        BundleExport export = new BundleExport();
        export.setStatus("finished");
        ClientBundle client = mock(ClientBundle.class);

        URL urlMock = MockitoUtils.getMockUrl(getClass());

        when(client.downloadBundle(bundle.getId(), null))
                .thenReturn(urlMock);
        when(client.getBundle(bundle.getId()))
                .thenReturn(Optional.of(bundle));

        when(client.startExportingBundle(bundle.getId()))
                .thenReturn(export);

        FilesInterface files = mock(FilesInterface.class);

        NewAction<ProjectProperties, ClientBundle> action =
                new BundleDownloadAction(bundle.getId(), files, false, false, false, true);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).getBundle(bundle.getId());
        verify(client).startExportingBundle(bundle.getId());
        verify(client).downloadBundle(bundle.getId(), null);

        verifyNoMoreInteractions(client);
    }
}
