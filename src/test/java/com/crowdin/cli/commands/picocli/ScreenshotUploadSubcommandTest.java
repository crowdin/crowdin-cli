package com.crowdin.cli.commands.picocli;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.File;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Stream;

import static com.crowdin.cli.commands.picocli.GenericCommand.RESOURCE_BUNDLE;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.params.provider.Arguments.arguments;

public class ScreenshotUploadSubcommandTest extends PicocliTestUtils {

    @Test
    public void testScreenshotUploadInvalidOptions() {
        this.executeInvalidParams(CommandNames.SCREENSHOT, CommandNames.SCREENSHOT_UPLOAD);
    }

    @ParameterizedTest
    @MethodSource
    public void testSubCommandCheckValidOptions(File file, boolean autoTag, String filePath, String branchName, String directoryPath) {
        ScreenshotUploadSubcommand screenshotUploadSubcommand = new ScreenshotUploadSubcommand();
        screenshotUploadSubcommand.file = file;
        screenshotUploadSubcommand.autoTag = autoTag;
        screenshotUploadSubcommand.filePath = filePath;
        screenshotUploadSubcommand.branchName = branchName;
        screenshotUploadSubcommand.directoryPath = directoryPath;

        List<String> errors = screenshotUploadSubcommand.checkOptions();
        assertEquals(Collections.emptyList(), errors);
    }

    public static Stream<Arguments> testSubCommandCheckValidOptions() {
        return Stream.of(
                arguments("/path/screenshot1.png", false, null, null, null),
                arguments("/path/screenshot2.jpg", true, "/path/sourse/file", null, null),
                arguments("/path/screenshot3.jpeg", true, null, "branchTest", null),
                arguments("/path/screenshot4.gif", true, null, null, "/path/to/directory"));
    }

    @ParameterizedTest
    @MethodSource
    public void testSubCommandCheckInvalidOptions(File file, boolean autoTag, String filePath, String branchName, String directoryPath, List<String> expErrors) {
        ScreenshotUploadSubcommand screenshotUploadSubcommand = new ScreenshotUploadSubcommand();
        screenshotUploadSubcommand.file = file;
        screenshotUploadSubcommand.autoTag = autoTag;
        screenshotUploadSubcommand.filePath = filePath;
        screenshotUploadSubcommand.branchName = branchName;
        screenshotUploadSubcommand.directoryPath = directoryPath;

        List<String> errors = screenshotUploadSubcommand.checkOptions();
        assertThat(errors, Matchers.equalTo(expErrors));
    }

    public static Stream<Arguments> testSubCommandCheckInvalidOptions() {
        return Stream.of(
                arguments("/path/screenshot1.zip", false, null, null, null, Arrays.asList(RESOURCE_BUNDLE.getString("error.screenshot.wrong_format"))),
                arguments("/path/screenshot2.jpg", false, "/path/sourse/file", null, null, Arrays.asList(RESOURCE_BUNDLE.getString("error.screenshot.auto-tag_required_for_file"))),
                arguments("/path/screenshot3.jpeg", false, null, "branchTest", null, Arrays.asList(RESOURCE_BUNDLE.getString("error.screenshot.auto-tag_required_for_branch"))),
                arguments("/path/screenshot4.png", false, null, null, "/path/to/directory", Arrays.asList(RESOURCE_BUNDLE.getString("error.screenshot.auto-tag_required_for_directory"))),
                arguments("/path/screenshot5.jpg", true, "/path/sourse/file", null, "/path/to/directory", Arrays.asList(RESOURCE_BUNDLE.getString("error.screenshot.only_one_allowed"))),
                arguments("/path/screenshot6.gif", true, null, "branchTest", "/path/to/directory", Arrays.asList(RESOURCE_BUNDLE.getString("error.screenshot.only_one_allowed")))
        );
    }
}