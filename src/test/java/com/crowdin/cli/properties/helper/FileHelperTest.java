package com.crowdin.cli.properties.helper;

import com.crowdin.cli.utils.Utils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.params.provider.Arguments.arguments;

public class FileHelperTest {

    private TempProject project;

    private static String a =      Utils.normalizePath("a.txt");
    private static String ax =     Utils.normalizePath("a.xml");
    private static String f1a =    Utils.normalizePath("f1/a.txt");
    private static String f1ax =   Utils.normalizePath("f1/a.xml");
    private static String f11a =   Utils.normalizePath("f1/in1/a.txt");
    private static String f11ax =  Utils.normalizePath("f1/in1/a.xml");
    private static String f2a =    Utils.normalizePath("f2/a.txt");
    private static String f2ax =   Utils.normalizePath("f2/a.xml");
    private static String f21a =   Utils.normalizePath("f2/in1/a.txt");
    private static String f21ax =  Utils.normalizePath("f2/in1/a.xml");

    private static String f1 =     Utils.normalizePath("f1/");
    private static String f11 =    Utils.normalizePath("f1/in1/");
    private static String f2 =     Utils.normalizePath("f2/");
    private static String f21 =    Utils.normalizePath("f2/in1/");

    private static String fintlicu = Utils.normalizePath("f+intl-icu.en.yaml");

    private static String projectRoot = Utils.normalizePath("");

    private static List<String> allFiles = Arrays.asList(a, ax, f1a, f1ax, f11a, f11ax, f2a, f2ax, f21a, f21ax);

    private static List<String> allDirs = Arrays.asList(f1, f11, f2, f21);

    private static List<String> all = new ArrayList<String>() {{
            addAll(allFiles);
            addAll(allDirs);
        }};


    @BeforeEach
    public void createProj() {
        project = new TempProject(FileHelperTest.class);
    }

    @AfterEach
    public void deleteProj() {
        project.delete();
    }

    @Test
    public void testNpe() {
        assertThrows(NullPointerException.class, () -> new FileHelper(null), "FileHelper should throw NPE");
        FileHelper fileHelper = new FileHelper(project.getBasePath());
        assertThrows(NullPointerException.class, () -> fileHelper.getFiles(null), "FileHelper should throw NPE in getFiles");
        assertThrows(NullPointerException.class, () -> fileHelper.filterOutIgnoredFiles(null, null),
            "FileHelper should throw NPE in filterOutIgnoredFiles");
        assertThrows(NullPointerException.class, () -> fileHelper.filterOutIgnoredFiles(new ArrayList<>(), null),
            "FileHelper should throw NPE in filterOutIgnoredFiles");
        assertThrows(NullPointerException.class, () -> fileHelper.filterOutIgnoredFiles(null, new ArrayList<>()),
            "FileHelper should throw NPE in filterOutIgnoredFiles");
    }

    @Test
    public void testFilterSourcesWithSpecialSymbols() {
        List<File> sources = new ArrayList<>();
        sources.add(new File("/files/folder/sub/1.xml"));
        sources.add(new File("/files/{{cookiecutter.module_name}}"));
        sources.add(new File("/files/{{cookiecutter.module_name}}/1.xml"));
        FileHelper fileHelper = new FileHelper(project.getBasePath());
        List<File> actualResult = fileHelper.filterOutIgnoredFiles(sources, Arrays.asList(".*"));
        assertEquals(sources, actualResult);
    }

    @Test
    public void testGetFiles_WrongBasePath() {
        FileHelper fileHelper = new FileHelper(project.getBasePath() + "non_existent_folder");
        List<File> result = fileHelper.getFiles(Utils.normalizePath("**/*"));
        assertEquals(0, result.size(), "Size of list must be 0 - base path doesn't exist");
    }

    @ParameterizedTest
    @MethodSource
    public void testGetFiles(List<String> files, String source, List<String> expected) {
        files.forEach(project::addFile);
        FileHelper fileHelper = new FileHelper(project.getBasePath());
        List<File> filesExpected = expected.stream().map(f -> new File(project.getBasePath() + f)).collect(Collectors.toList());

        List<File> result = fileHelper.getFiles(source);

        assertTrue(filesExpected.containsAll(result),
            "(source: " + source + ") Expected list contains more elems than result \n\t(exp: " + filesExpected + ")\n\t(res: " + result + ")");
        assertEquals(filesExpected.size(), result.size(), "(source: " + source + ") Lists sizes are not equal");
    }

    static Stream<Arguments> testGetFiles() {
        return Stream.of(
            arguments(allFiles, Utils.normalizePath("**/*"), all),
            arguments(allFiles, Utils.normalizePath("**"), addToList(allDirs, projectRoot)),
            arguments(allFiles, Utils.normalizePath("f?/**"), allDirs),
            arguments(allFiles, Utils.normalizePath("f[1]/**"), Arrays.asList(f1, f11)),
            arguments(allFiles, Utils.normalizePath("f1/**"), Arrays.asList(f1, f11)),
            arguments(allFiles, Utils.normalizePath("f[12]/**"), allDirs),
            arguments(allFiles, Utils.normalizePath("f[1-2]/**"), allDirs),
            arguments(allFiles, Utils.normalizePath("f?/**"), allDirs),
            arguments(allFiles, Utils.normalizePath("*.*"), Arrays.asList(a, ax)),
            arguments(allFiles, Utils.normalizePath("?.*"), Arrays.asList(a, ax)),
            arguments(allFiles, Utils.normalizePath("*"), Arrays.asList(a, ax, f1, f2)),
            arguments(allFiles, Utils.normalizePath("f3/**/*"), Collections.EMPTY_LIST),
            arguments(allFiles, Utils.normalizePath("/f1/**"), Arrays.asList(f1, f11)),
            arguments(Collections.singletonList(fintlicu), fintlicu, Arrays.asList(fintlicu))
        );
    }

    private static <E> List<E> addToList(List<E> list, E... toAdd) {
        List<E> toReturn = new ArrayList<>(list);
        toReturn.addAll(Arrays.asList(toAdd));
        return toReturn;
    }
}