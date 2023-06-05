package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.client.distributions.model.Distribution;
import com.crowdin.client.distributions.model.ExportMode;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.*;

public class DistributionListActionTest {

    List<Distribution> standardList = Arrays.asList(
        new Distribution() {{
                setName("Distribution 1");
                setExportMode(ExportMode.DEFAULT.toString());
            }},
        new Distribution() {{
                setName("Distribution 2");
                setExportMode(ExportMode.BUNDLE.toString());

        }}
    );
    List<Distribution> emptyList = Collections.emptyList();

    Outputter out = Outputter.getDefault();
    PropertiesWithFiles pb;

    ClientDistribution clientMock = mock(ClientDistribution.class);
    NewAction<ProjectProperties, ClientDistribution> action;

    @Test
    public void test_standard() {
        when(clientMock.listDistribution())
            .thenReturn(standardList);

        action = new DistributionListAction(false, false);
        action.act(out, pb, clientMock);

        verify(clientMock).listDistribution();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_plainView() {
        when(clientMock.listDistribution())
            .thenReturn(standardList);

        action = new DistributionListAction(true, false);
        action.act(out, pb, clientMock);

        verify(clientMock).listDistribution();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList() {
        when(clientMock.listDistribution())
            .thenReturn(emptyList);

        action = new DistributionListAction(false, false);
        action.act(out, pb, clientMock);

        verify(clientMock).listDistribution();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList_plainView() {
        when(clientMock.listDistribution())
            .thenReturn(emptyList);

        action = new DistributionListAction(true, false);
        action.act(out, pb, clientMock);

        verify(clientMock).listDistribution();
        verifyNoMoreInteractions(clientMock);
    }
}
