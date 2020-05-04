package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.PlaceholderUtilBuilder;
import com.crowdin.cli.utils.Utils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.File;
import java.util.Collections;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;

public class SourcesUtilsTest {

    private TempProject tempProject;

    @BeforeEach
    private void initFolder() {
        tempProject = new TempProject(PropertiesBuilderTest.class);
    }

    @AfterEach
    private void removeFolder() {
        tempProject.delete();
    }

    @Test
    public void testGetFilesEverythingNull1() {
        SourcesUtils sourcesUtils = new SourcesUtils();
        assertThrows(NullPointerException.class, () -> SourcesUtils.getFiles(null, null, null, null));
    }

    @Test
    public void testGetFilesZeroFiles1() {
        Stream<File> sources = SourcesUtils.getFiles(
            tempProject.getBasePath(),
            "*",
            Collections.EMPTY_LIST,
            PlaceholderUtilBuilder.STANDART.build(tempProject.getBasePath()));
        assertEquals(0, sources.count());
    }

    @ParameterizedTest
    @MethodSource
    public void testGetFiles1(String source, List<String> ignores, int expectedResult) {
        tempProject.addFile("first.txt");
        tempProject.addFile("first.xml");
        tempProject.addFile("folder/second.txt");
        tempProject.addFile("folder/second.xml");
        Stream<File> sources = SourcesUtils.getFiles(
            tempProject.getBasePath(),
            source,
            ignores,
            PlaceholderUtilBuilder.STANDART.build(tempProject.getBasePath()));
        assertEquals(expectedResult, sources.count(), "Error for source: '" + source + "' and ignores: '" + ignores + "'");
    }

    static Stream<Arguments> testGetFiles1() {
        return Stream.of(
            arguments("*", Collections.EMPTY_LIST, 2),
            arguments("*", Collections.singletonList("*"), 0),
            arguments("*", Collections.singletonList("**" + Utils.PATH_SEPARATOR + "*"), 0),
            arguments("*", Collections.singletonList("folder" + Utils.PATH_SEPARATOR + "*"), 2),
            arguments("*", Collections.singletonList("f*" + Utils.PATH_SEPARATOR + "*"), 2),
            arguments("**/*", Collections.EMPTY_LIST, 4),
            arguments("**/*", Collections.singletonList("*"), 2),
            arguments("**/*", Collections.singletonList("f*" + Utils.PATH_SEPARATOR + "*"), 2),
            arguments("**/*", Collections.singletonList("**" + Utils.PATH_SEPARATOR + "*.xml"), 2),
            arguments("**/*", Collections.singletonList("folder" + Utils.PATH_SEPARATOR + "*"), 2),
            arguments("**/*", Collections.singletonList("folder" + Utils.PATH_SEPARATOR + "*.xml"), 3),
            arguments("**/*", Collections.singletonList("folder" + Utils.PATH_SEPARATOR), 2),
            arguments("**/*", Collections.singletonList("f*"), 2)
        );
    }

    @ParameterizedTest
    @MethodSource
    public void testContainsParameter(String sourcePattern, boolean expected) {
        boolean result = SourcesUtils.containsPattern(sourcePattern);
        assertEquals(expected, result, "Wrong result with source pattern: " + sourcePattern);
    }

    private static Stream<Arguments> testContainsParameter() {
        return Stream.of(
            arguments(null, false),
            arguments("*", true),
            arguments(Utils.normalizePath("f1/**/file.txt"), true),
            arguments(Utils.normalizePath("folder/?.txt"), true),
            arguments(Utils.normalizePath("folder/[a-z]/file.txt"), true),
                arguments(Utils.normalizePath("folder/[a-z/file.txt"), false),
            arguments(Utils.normalizePath("folder/file.txt"), false),
            arguments("", false)
        );
    }
}
