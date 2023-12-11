package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.PlaceholderUtilBuilder;
import com.crowdin.cli.utils.Utils;
import org.apache.commons.io.FilenameUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.crowdin.cli.utils.AssertUtils.assertPathsEqualIgnoringSeparator;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
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
    @DisabledOnOs(OS.WINDOWS)
    public void testFilterProjectFiles_wPreserveHierarchy_noIgnores(List<String> filePaths, String sourcePattern, List<String> expected) {
        List<String> actual = SourcesUtils.filterProjectFiles(
            filePaths, sourcePattern, Collections.EMPTY_LIST, true, PlaceholderUtilBuilder.STANDART.build(""));

        actual = actual.stream().map(i -> i.replace("/", File.separator).replace("\\", File.separator))
                .collect(Collectors.toList());
        expected = expected.stream().map(i -> i.replace("/", File.separator).replace("\\", File.separator))
                .collect(Collectors.toList());
        assertEquals(expected.size(), actual.size());
        assertThat(actual, containsInAnyOrder(expected.toArray()));
    }

    static Stream<Arguments> testFilterProjectFiles_wPreserveHierarchy_noIgnores() {
        String fileHereThere = "here/there/file.po";
        String fileHereNotThere = "here/not-there/file.po";
        String fileNotHereThere = "not-here/there/file.po";
        String fileNotHereNotThere = "not-here/not-there/file.po";
        String fileNum1 = "num/file1.po";
        String fileNum2 = "num/file2.po";
        String fileNum3 = "num/file3.po";
        String fileEnGb = "en_GB/basic/source/sbx.po";
        String file2EnGb = "en_GB/basic/source/classes.po";
        return Stream.of(
            arguments(
                Arrays.asList(fileHereThere),
                "here/there/file.po",
                Arrays.asList(fileHereThere)
            ),
            arguments(
                Arrays.asList(fileHereThere),
                "here/not-there/file.po",
                Collections.EMPTY_LIST
            ),
            arguments(
                Arrays.asList(fileHereThere, fileHereNotThere, fileNotHereThere, fileNotHereNotThere),
                "here/*/file.po",
                Arrays.asList(fileHereThere, fileHereNotThere)
            ),
            arguments(
                Arrays.asList(fileHereThere, fileHereNotThere, fileNotHereThere, fileNotHereNotThere),
                "here/**/file.po",
                Arrays.asList(fileHereThere, fileHereNotThere)
            ),
            arguments(
                Arrays.asList(fileHereThere, fileHereNotThere, fileNotHereThere, fileNotHereNotThere),
                "**/file.po",
                Arrays.asList(fileHereThere, fileHereNotThere, fileNotHereThere, fileNotHereNotThere)
            ),
            arguments(
                Arrays.asList(fileNum1, fileNum2, fileNum3),
                "num/file?.po",
                Arrays.asList(fileNum1, fileNum2, fileNum3)
            ),
            arguments(
                Arrays.asList(fileNum1, fileNum2, fileNum3),
                "num/file[1-2].po",
                Arrays.asList(fileNum1, fileNum2)
            ),
            arguments(
                Arrays.asList(fileNum1, fileNum2, fileNum3),
                "num/file[^1-2].po",
                Arrays.asList(fileNum3)
            ),
            arguments(
                Arrays.asList(fileEnGb, file2EnGb),
                "/en_GB/basic/**/*.po",
                Arrays.asList(fileEnGb, file2EnGb)
            )
        );
    }

    @ParameterizedTest
    @MethodSource
    @DisabledOnOs(OS.WINDOWS)
    public void testFilterProjectFiles_wPreserveHierarchy_wIgnores(
        List<String> filePaths, String sourcePattern, List<String> ignorePatterns, List<String> expected
    ) {
        List<String> actual = SourcesUtils.filterProjectFiles(
            filePaths, sourcePattern, ignorePatterns, true, PlaceholderUtilBuilder.STANDART.build(""));
//        assertEquals(expected.size(), actual.size());
        expected = expected.stream().map(FilenameUtils::separatorsToSystem).collect(Collectors.toList());
        assertThat(actual, containsInAnyOrder(expected.toArray()));
    }

    static Stream<Arguments> testFilterProjectFiles_wPreserveHierarchy_wIgnores() {
        String fileHereThere = "here/there/file.po";
        String fileHereNotThere = "here/not-there/file.po";
        String fileNotHereThere = "not-here/there/file.po";
        String fileNotHereNotThere = "not-here/not-there/file.po";
        String fileNum1 = "num/file1.po";
        String fileNum2 = "num/file2.po";
        String fileNum3 = "num/file3.po";
        String fileRes = "resources/file.po";
        String enFileRes = "resources/en_file.po";
        String uaFileRes = "resources/ua_file.po";
        return Stream.of(
            arguments(
                Arrays.asList(fileNum1, fileNum2, fileNum3),
                "num/file[1-3].po",
                Arrays.asList("num/file1.po", "num/file2.po"),
                Arrays.asList(fileNum3)
            ),
            arguments(
                Arrays.asList(fileNum1, fileNum2, fileNum3),
                "num/file[1-3].po",
                Arrays.asList("num/file?.po"),
                Collections.EMPTY_LIST
            ),
            arguments(//3
                Arrays.asList(fileHereThere, fileNotHereThere, fileHereNotThere, fileNotHereNotThere),
                "**/*",
                Arrays.asList("here/**/file.po"),
                Arrays.asList(fileNotHereThere, fileNotHereNotThere)
            ),
            arguments(//4
                Arrays.asList(fileHereThere, fileNotHereThere, fileHereNotThere, fileNotHereNotThere),
                "**/*",
                Arrays.asList("**/*"),
                Collections.EMPTY_LIST
            ),
            arguments(
                Arrays.asList(fileRes, enFileRes, uaFileRes),
                "**/*",
                Arrays.asList("resources/%two_letters_code%_file.po"),
                Arrays.asList(fileRes)
            ),
            arguments(//6
                Arrays.asList(fileRes, enFileRes, uaFileRes),
                "**/*",
                Arrays.asList("%original_path%/%two_letters_code%_file.po"),
                Arrays.asList(fileRes)
            ),
            arguments(
                Arrays.asList(fileRes, enFileRes, uaFileRes),
                "**/*",
                Arrays.asList("resources/%two_letters_code%_%original_file_name%"),
                Arrays.asList(fileRes)
            ),
            arguments(
                Arrays.asList(fileRes, enFileRes, uaFileRes),
                "**/*",
                Arrays.asList("resources/%two_letters_code%_file.%file_extension%"),
                Arrays.asList(fileRes)
            ),
            arguments(
                Arrays.asList(fileRes, enFileRes, uaFileRes),
                "**/*",
                Arrays.asList("resources/%two_letters_code%_%file_name%.po"),
                Arrays.asList(fileRes)
            )
        );
    }

    @ParameterizedTest
    @MethodSource
    @DisabledOnOs(OS.WINDOWS)
    public void testFilterProjectFiles_noPreserveHierarchy_noIgnores(List<String> filePaths, String sourcePattern, List<String> expected) {
        List<String> actual = SourcesUtils.filterProjectFiles(
                filePaths, sourcePattern, Collections.emptyList(), false, PlaceholderUtilBuilder.STANDART.build(""));
        assertEquals(expected.size(), actual.size());
        assertThat(actual, containsInAnyOrder(expected.toArray()));
    }

    static Stream<Arguments> testFilterProjectFiles_noPreserveHierarchy_noIgnores() {
        String file1 = "file1.po";
        String file2Here = "here/file2.po";
        String file3There = "here/there/file3.po";
        return Stream.of(
            arguments(
                Arrays.asList(file1, file2Here, file3There),
                "en_GB/**/file[1-3].po",
                Arrays.asList(file1, file2Here, file3There)
            ),
            arguments(
                // There may be or file1, or file2, but not both of them simultaneously,
                // but because we can't know which one is correct, so we're choosing both of them
                Arrays.asList(file1, file2Here, file3There),
                "here/file[1-3].po",
                Arrays.asList(file1, file2Here)
            ),
            arguments(
                Arrays.asList(file1, file2Here, file3There),
                "not-here/*/file[1-3].po",
                Arrays.asList(file1, file2Here)
            ),
            arguments(
                Arrays.asList(file1, file2Here, file3There),
                "file[1-3].po",
                Arrays.asList(file1)
            )
        );
    }

    @ParameterizedTest
    @MethodSource
    public void testFilterProjectFiles_noPreserveHierarchy_wIgnores(
        List<String> filePaths, String sourcePattern, List<String> ignorePatterns, List<String> expected
    ) {
        List<String> actual = SourcesUtils.filterProjectFiles(
            filePaths, sourcePattern, ignorePatterns, false, PlaceholderUtilBuilder.STANDART.build(""));
        expected = expected.stream().map(path -> path.replace("/", File.separator)).collect(Collectors.toList());
//        assertEquals(expected.size(), actual.size());
        assertThat(actual, containsInAnyOrder(expected.toArray()));
    }

    static Stream<Arguments> testFilterProjectFiles_noPreserveHierarchy_wIgnores() {
        String file1 = "file1.po";
        String file2Here = "here/file2.po";
        String file3NotHere = "not-here/file3.po";
        String file4HereThere = "here/there/file4.po";
        String file5HereNotThere = "here/not-there/file5.po";
        String fileRes = "resources/file.po";
        String fileResEn = "resources/en_file.po";
        String fileResUa = "resources/ua_file.po";
        return Stream.of(
            arguments(
                Arrays.asList(file1, file2Here, file3NotHere),
                "**/*",
                Arrays.asList("here/**/file?.po"),
                Collections.EMPTY_LIST
            ),
            arguments(
                Arrays.asList(file1, file2Here, file3NotHere, file4HereThere, file5HereNotThere),
                "**/*",
                Arrays.asList("here/*/file?.po"),
                Arrays.asList(file1, file2Here, file3NotHere)
            ),
            arguments(
                Arrays.asList(file1, file2Here, file3NotHere, file4HereThere, file5HereNotThere),
                "**/*",
                Arrays.asList("there/file?.po"),
                Arrays.asList(file1, file2Here, file3NotHere, file5HereNotThere)
            ),
            arguments(
                Arrays.asList(fileRes, fileResEn, fileResUa),
                "**/*",
                Arrays.asList("**/%two_letters_code%_file.po"),
                Arrays.asList(fileRes)
            ),
            arguments(
                Arrays.asList(fileRes, fileResEn, fileResUa),
                "**/*",
                Arrays.asList("%original_path%/%two_letters_code%_file.po"),
                Arrays.asList(fileRes)
            ),
            arguments(
                Arrays.asList(fileRes, fileResEn, fileResUa),
                "**/*",
                Arrays.asList("resources/%two_letters_code%_%file_name%.po"),
                Arrays.asList(fileRes)
            )
        );
    }

    @Test
    public void testFilterProjectFiles_dest() {
        List<String> filePaths = Arrays.asList("common/strings.xml");
        String sourcePattern = "/common/%original_file_name%";
        List<String> ignorePatterns = null;
        Path expected = Paths.get("common/strings.xml");

        List<Path> actual = SourcesUtils.filterProjectFiles(filePaths, sourcePattern, ignorePatterns,
                        true, PlaceholderUtilBuilder.STANDART.build("")).stream().map(Paths::get)
                .collect(Collectors.toList());
        assertThat(actual, containsInAnyOrder(expected));
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

    @ParameterizedTest
    @MethodSource
    public void testReplaceUnaryAsterisk(String sourcePattern, String projectFile, String expected) {
        assertPathsEqualIgnoringSeparator(SourcesUtils.replaceUnaryAsterisk(sourcePattern, projectFile), expected);
    }

    public static Stream<Arguments> testReplaceUnaryAsterisk() {
        return Stream.of(
            arguments("/*.xml", "destination/crowdin_sample_android.xml", "/crowdin_sample_android.xml")
        );
    }
}
