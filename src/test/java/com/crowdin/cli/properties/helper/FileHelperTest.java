package com.crowdin.cli.properties.helper;

import org.apache.commons.io.FilenameUtils;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.File;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.params.provider.Arguments.arguments;

public class FileHelperTest {

    static TempProject project;
    static String javaClass = "src/java/com/danya/Source.java";
    static String xmlClass = "src/resources/messages.xml";
    static String en_xmlClass = "src/java/com/danya/en_messages.xml";


    @BeforeAll
    static void createProj() {
        project = new TempProject(FileHelperTest.class);
        project.addFile(javaClass);
        project.addFile(xmlClass);
        project.addFile(en_xmlClass);
    }

    @AfterAll
    static void deleteProj() {
        project.delete();
    }

    @ParameterizedTest
    @MethodSource
    public void testGetFileSource(String source, int numOfFiles) {
        FileHelper fileHelper = new FileHelper(project.getBasePath());
        List<File> sources = fileHelper.getFileSource(source);
        assertEquals(numOfFiles, sources.size());
    }

    static Stream<Arguments> testGetFileSource() {
        return Stream.of(
                arguments(FilenameUtils.separatorsToSystem("/**/*.*"), 3),
                arguments(FilenameUtils.separatorsToSystem("/**/*.xml"), 2)
        );
    }
}