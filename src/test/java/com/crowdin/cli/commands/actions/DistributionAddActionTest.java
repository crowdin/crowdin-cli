package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.distributions.model.AddDistributionRequest;
import com.crowdin.client.distributions.model.Distribution;
import com.crowdin.client.distributions.model.ExportMode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.*;

public class DistributionAddActionTest {

    NewAction<ProjectProperties, ClientDistribution> action;

    @ParameterizedTest
    @MethodSource
    public void testDistributionAdd(String name, ExportMode exportMode, List<Long> fileIds) {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        AddDistributionRequest request = RequestBuilder.addDistribution(name, exportMode, fileIds);

        ClientDistribution client = mock(ClientDistribution.class);
        when(client.addDistribution(request))
                .thenReturn(new Distribution() {{
                    setName(request.getName());
                    setFileIds(request.getFileIds());
                    setExportMode(request.getExportMode().toString());
                }});
        action = new DistributionAddAction(name, exportMode, fileIds);
        action.act(Outputter.getDefault(), pb, client);
        verify(client).addDistribution(request);
        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testDistributionAdd() {
        return Stream.of(arguments("My Distribution 1", ExportMode.DEFAULT, Arrays.asList(12L)));
    }

    @Test
    public void testAddDistributionThrows() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ClientDistribution client = mock(ClientDistribution.class);

        AddDistributionRequest request = RequestBuilder.addDistribution(null, null, null);


        when(client.addDistribution(request))
                .thenThrow(new RuntimeException("Whoops"));

        action = new DistributionAddAction(null, null, null);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).addDistribution(request);
        verifyNoMoreInteractions(client);
    }

}
