package com.crowdin.cli.properties;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.helper.TempProject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static com.crowdin.cli.properties.PropertiesConfigurator.CheckType;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class PropertiesWithFilesTest {

    private final Outputter out = Outputter.getDefault();
    private TempProject tempProject;

    NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder.minimalBuiltPropertiesBean();

    @BeforeEach
    public void setUp() {
        tempProject = new TempProject(PropertiesWithFilesTest.class);
    }

    @AfterEach
    public void tearDown() {
        tempProject.delete();
    }

    @Test
    public void rightParams_populateWithPreserveHierarchyArg() {
        ParamsWithFiles params = new ParamsWithFiles();
        params.setPreserveHierarchy(true);
        PropertiesWithFiles props = pbBuilder.build();

        new PropertiesWithFilesBuilder(out).populateWithArgParams(props, params);
        assertEquals(params.getPreserveHierarchy(), props.getPreserveHierarchy());
    }

    @Test
    public void testPopulateWithArgParams_NoPreserveHierarchy() {
        ParamsWithFiles params = new ParamsWithFiles();
        PropertiesWithFiles props = pbBuilder.build();

        new PropertiesWithFilesBuilder(out).populateWithArgParams(props, params);
        assertFalse(props.getPreserveHierarchy());
    }

    @Test
    public void testCheckProperties_sourceFileExists_noError() {
        tempProject.addFile("test.txt", "content");

        PropertiesWithFiles props = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("test.txt", "/%original_file_name%-%locale%")
            .setBasePath(tempProject.getBasePath())
            .build();

        PropertiesBuilder.Messages messages = PropertiesWithFiles.CONFIGURATOR.checkProperties(props, CheckType.LINT);

        assertTrue(messages.getErrors().isEmpty(), "Expected no errors when source file exists");
    }

    @Test
    public void testCheckProperties_sourceFileNotExists_hasError() {
        PropertiesWithFiles props = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("nonexistent.txt", "/%original_file_name%-%locale%")
            .setBasePath(tempProject.getBasePath())
            .build();

        PropertiesBuilder.Messages messages = PropertiesWithFiles.CONFIGURATOR.checkProperties(props, CheckType.LINT);

        assertFalse(messages.getErrors().isEmpty(), "Expected error when source file does not exist");
        assertTrue(messages.getErrors().stream().anyMatch(e -> e.contains("No source files found")),
            "Expected error message about missing source files");
    }

    @Test
    public void testCheckProperties_sourceGlobPatternMatches_noError() {
        tempProject.addFile("file1.xml", "content");
        tempProject.addFile("file2.xml", "content");

        PropertiesWithFiles props = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*.xml", "/%original_file_name%-%locale%")
            .setBasePath(tempProject.getBasePath())
            .build();

        PropertiesBuilder.Messages messages = PropertiesWithFiles.CONFIGURATOR.checkProperties(props, CheckType.LINT);

        assertTrue(messages.getErrors().isEmpty(), "Expected no errors when glob pattern matches files");
    }

    @Test
    public void testCheckProperties_sourceGlobPatternNoMatch_hasError() {
        tempProject.addFile("file.txt", "content");

        PropertiesWithFiles props = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*.xml", "/%original_file_name%-%locale%")
            .setBasePath(tempProject.getBasePath())
            .build();

        PropertiesBuilder.Messages messages = PropertiesWithFiles.CONFIGURATOR.checkProperties(props, CheckType.LINT);

        assertFalse(messages.getErrors().isEmpty(), "Expected error when glob pattern matches no files");
        assertTrue(messages.getErrors().stream().anyMatch(e -> e.contains("No source files found")),
            "Expected error message about missing source files");
    }

    @Test
    public void testCheckProperties_sourceDoubleAsteriskPattern_noError() {
        tempProject.addFile("src/main/file.xml", "content");

        PropertiesWithFiles props = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("**/*.xml", "/%original_file_name%-%locale%")
            .setBasePath(tempProject.getBasePath())
            .build();

        PropertiesBuilder.Messages messages = PropertiesWithFiles.CONFIGURATOR.checkProperties(props, CheckType.LINT);

        assertTrue(messages.getErrors().isEmpty(), "Expected no errors when ** pattern matches files");
    }
}
