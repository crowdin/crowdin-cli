package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.bundles.model.AddBundleRequest;
import com.crowdin.client.bundles.model.Bundle;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.verifyNoMoreInteractions;

class BundleCloneActionTest {

    NewAction<ProjectProperties, ClientBundle> action;

    @ParameterizedTest
    @MethodSource
    public void testBundleClone(Long id, String name, String format, List<String> source, List<String> ignore, String translation,
                              List<Long> labels) {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        AddBundleRequest request = new AddBundleRequest();
        request.setName(name);
        request.setFormat(format);
        request.setExportPattern(translation);
        request.setLabelIds(labels);
        request.setIgnorePatterns(ignore);
        request.setSourcePatterns(source);
        request.setIncludeProjectSourceLanguage(false);
        request.setIncludeInContextPseudoLanguage(false);
        request.setIsMultilingual(false);

        ClientBundle client = mock(ClientBundle.class);
        when(client.getBundle(1L)).thenReturn(new Bundle() {{
            setName("my_bundle");
            setSourcePatterns(new ArrayList<>());
            setMultilingual(true);
        }});
        when(client.addBundle(request))
            .thenReturn(new Bundle() {{
                setName(request.getName());
                setFormat(request.getFormat());
                setExportPattern(request.getExportPattern());
                setLabelIds(request.getLabelIds());
                setIgnorePatterns(request.getIgnorePatterns());
                setSourcePatterns(request.getSourcePatterns());
            }});
        action = new BundleCloneAction(id, name, format, source, ignore, translation, labels, false, false, false, false);
        action.act(Outputter.getDefault(), pb, client);
        verify(client).getBundle(id);
        verify(client).addBundle(request);
        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testBundleClone() {
        return Stream.of(
            arguments(1L, "My bundle", "crowdin-resx", Arrays.asList("/master/"),
                Arrays.asList("/master/environments/"), "strings-%two_letters_code%.resx", new ArrayList<>()));
    }

    @Test
    public void testBundleClone_sourceValues() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        AddBundleRequest request = new AddBundleRequest();
        request.setName("my_bundle (clone)");
        request.setFormat("crowdin-resx");
        request.setIncludeProjectSourceLanguage(false);
        request.setIncludeInContextPseudoLanguage(false);
        request.setIsMultilingual(false);

        ClientBundle client = mock(ClientBundle.class);
        when(client.getBundle(1L)).thenReturn(new Bundle() {{
            setName("my_bundle");
            setFormat("crowdin-resx");
            setIncludeProjectSourceLanguage(false);
            setIncludeInContextPseudoLanguage(false);
            setMultilingual(false);
        }});
        when(client.addBundle(request))
            .thenReturn(new Bundle() {{
                setName(request.getName());
                setFormat(request.getFormat());
                setExportPattern(request.getExportPattern());
                setLabelIds(request.getLabelIds());
                setIgnorePatterns(request.getIgnorePatterns());
                setSourcePatterns(request.getSourcePatterns());
            }});
        action = new BundleCloneAction(1L, null, null, null, null, null, null, true, null, null, null);
        action.act(Outputter.getDefault(), pb, client);
        verify(client).getBundle(1L);
        verify(client).addBundle(request);
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testBundleClone_throwException() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        AddBundleRequest request = new AddBundleRequest();
        request.setName("my_bundle (clone)");
        request.setFormat("crowdin-resx");
        request.setIncludeProjectSourceLanguage(false);
        request.setIncludeInContextPseudoLanguage(false);
        request.setIsMultilingual(false);

        ClientBundle client = mock(ClientBundle.class);
        when(client.getBundle(1L)).thenReturn(new Bundle() {{
            setName("my_bundle");
            setFormat("crowdin-resx");
            setIncludeProjectSourceLanguage(false);
            setIncludeInContextPseudoLanguage(false);
            setMultilingual(false);
        }});
        when(client.addBundle(request)).thenThrow(new RuntimeException("Error"));
        action = new BundleCloneAction(1L, null, null, null, null, null, null, true, null, null, null);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));
    }

    @Test
    public void testBundleClone_nullBundleToClone() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ClientBundle client = mock(ClientBundle.class);
        when(client.getBundle(1L)).thenReturn(null);

        action = new BundleCloneAction(1L, null, null, null, null, null, null, true, null, null, null);
        action.act(Outputter.getDefault(), pb, client);
        verify(client).getBundle(1L);
        verifyNoMoreInteractions(client);
    }

}
