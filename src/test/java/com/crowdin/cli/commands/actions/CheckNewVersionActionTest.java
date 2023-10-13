package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.NoClient;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NoProperties;
import com.crowdin.cli.utils.Utils;
import com.sun.tools.javac.util.List;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;

import java.io.IOException;
import java.net.URL;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CheckNewVersionActionTest {


    @Mock
    private Outputter outputter;

    @Mock
    private NoProperties noProperties;

    @Mock
    private NoClient noClient;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }
    @Test
    void testActWithNewVersionAvailable() throws IOException {
        // Mock Utils methods
        when(Utils.getLatestVersionUrl()).thenReturn("https://example.com/latest_version.txt");
        when(Utils.getAppVersion()).thenReturn("1.0");

        // Mock the behavior of IOUtils.readLines
        when(IOUtils.readLines(any(URL.class).openStream(), any(String.class)))
                .thenReturn(List.of("2.0"));

        CheckNewVersionAction action = new CheckNewVersionAction();
        action.act(outputter, noProperties, noClient);

        // Verify that the outputter is called with the expected message
        Mockito.verify(outputter).println(Mockito.contains("1.0"));
        Mockito.verify(outputter).println(Mockito.contains("2.0"));
    }
    @Test
    void testActWithNoNewVersionAvailable() throws IOException {
        // Mock Utils methods
        when(Utils.getLatestVersionUrl()).thenReturn("https://example.com/latest_version.txt");
        when(Utils.getAppVersion()).thenReturn("1.0");

        // Mock the behavior of IOUtils.readLines
        when(IOUtils.readLines(any(URL.class).openStream(), any(String.class)))
                .thenReturn(List.of("1.0")); // Same version as the app

        CheckNewVersionAction action = new CheckNewVersionAction();
        action.act(outputter, noProperties, noClient);

        // Verify that the outputter is called with the expected message
        Mockito.verify(outputter, Mockito.never()).println(Mockito.contains("1.0"));
    }
    @Test
    void testActWithIOException() throws IOException {
        // Mock Utils methods
        when(Utils.getLatestVersionUrl()).thenReturn("https://example.com/latest_version.txt");
        when(Utils.getAppVersion()).thenReturn("1.0");

        // Mock the behavior of IOUtils.readLines to simulate an IOException
        when(IOUtils.readLines(any(URL.class).openStream(), any(String.class)))
                .thenThrow(new IOException("Simulated IO Exception"));

        CheckNewVersionAction action = new CheckNewVersionAction();
        action.act(outputter, noProperties, noClient);

        // Verify that the outputter is not called with new version information due to the exception
        Mockito.verify(outputter, Mockito.never()).println(Mockito.contains("1.0"));
    }
}