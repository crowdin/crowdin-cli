package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.Utils;

import com.crowdin.client.bundles.model.Bundle;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.*;

public class BundleAddActionTest {

    NewAction<ProjectProperties, ClientBundle> action;

    @ParameterizedTest
    @MethodSource
    public void testBundleAdd(String name, String format, List<String> source, List<String> ignore, String translation,
                              List<Long> labels) {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        Bundle request = new Bundle();
        request.setName(name);
        request.setFormat(format);
        request.setExportPattern(translation);
        request.setLabelIds(labels);
        request.setIgnorePatterns(ignore);
        request.setSourcePatterns(source);

        ClientBundle client = mock(ClientBundle.class);
        when(client.addBundle(request))
                .thenReturn(new Bundle() {{
                    setName(request.getName());
                    setFormat(request.getFormat());
                    setExportPattern(request.getExportPattern());
                    setLabelIds(request.getLabelIds());
                    setIgnorePatterns(request.getIgnorePatterns());
                    setSourcePatterns(request.getSourcePatterns());
                }});
        action = new BundleAddAction(name, format, source, ignore, translation, labels, false);
        action.act(Outputter.getDefault(), pb, client);
        verify(client).addBundle(request);
        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testBundleAdd() {
        return Stream.of(arguments("My bundle", "crowdin-resx", Arrays.asList("/master/"),
                                   Arrays.asList("/master/environments/"), "strings-%two_letters_code%.resx",
                                   new ArrayList<>()));
    }

    @Test
    public void testAddBundleThrows() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ClientBundle client = mock(ClientBundle.class);

        Bundle request = new Bundle();
        request.setName("");
        request.setFormat("");
        request.setExportPattern(null);
        request.setLabelIds(null);
        request.setIgnorePatterns(null);
        request.setSourcePatterns(null);

        when(client.addBundle(request))
                .thenThrow(new RuntimeException("Whoops"));

        action = new BundleAddAction("", "", null, null, null, null, false);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).addBundle(request);
        verifyNoMoreInteractions(client);
    }

}
