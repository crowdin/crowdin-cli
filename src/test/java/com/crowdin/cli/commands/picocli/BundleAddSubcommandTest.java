package com.crowdin.cli.commands.picocli;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Stream;

import static com.crowdin.cli.commands.picocli.GenericCommand.RESOURCE_BUNDLE;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.params.provider.Arguments.arguments;

public class BundleAddSubcommandTest extends PicocliTestUtils {

    @Test
    public void testBundleAddInvalidOptions() {
        this.executeInvalidParams(CommandNames.BUNDLE, CommandNames.BUNDLE_ADD, "Test Bundle1");
    }

    @ParameterizedTest
    @MethodSource
    public void testSubCommandCheckValidOptions(String name, String format, List<String> source, List<String> ignore, String translation, List<Long> labels) {
        BundleAddSubcommand bundleAddSubcommand = new BundleAddSubcommand();
        bundleAddSubcommand.name = name;
        bundleAddSubcommand.format = format;
        bundleAddSubcommand.source = source;
        bundleAddSubcommand.ignore = ignore;
        bundleAddSubcommand.translation = translation;
        bundleAddSubcommand.labels = labels;

        List<String> errors = bundleAddSubcommand.checkOptions();
        assertEquals(Collections.emptyList(), errors);
    }

    public static Stream<Arguments> testSubCommandCheckValidOptions() {
        return Stream.of(
            arguments("Bundle 1", "format1", Arrays.asList("src1"), Arrays.asList("ignore1"), "translation1", Arrays.asList(12L)),
            arguments("Bundle 2", "format2", Arrays.asList("src1"), null, "translation2", Arrays.asList()));
    }

    @ParameterizedTest
    @MethodSource
    public void testSubCommandCheckInvalidOptions(String name, String format, List<String> source, List<String> ignore, String translation, List<Long> labels, List<String> expErrors) {
        BundleAddSubcommand bundleAddSubcommand = new BundleAddSubcommand();
        bundleAddSubcommand.name = name;
        bundleAddSubcommand.format = format;
        bundleAddSubcommand.source = source;
        bundleAddSubcommand.ignore = ignore;
        bundleAddSubcommand.translation = translation;
        bundleAddSubcommand.labels = labels;

        List<String> errors = bundleAddSubcommand.checkOptions();
        assertThat(errors, Matchers.equalTo(expErrors));
    }

    public static Stream<Arguments> testSubCommandCheckInvalidOptions() {
        return Stream.of(
                arguments("Bundle 1", "", Arrays.asList("src1"), Arrays.asList("ignore1"), "translation1", Arrays.asList(12L), Arrays.asList(RESOURCE_BUNDLE.getString("error.bundle.empty_format"))),
                arguments("Bundle 2", "format2", Arrays.asList("src1"), null, "", Arrays.asList(), Arrays.asList(RESOURCE_BUNDLE.getString("error.bundle.empty_translation"))),
                arguments("Bundle 3", "format3", null, null, "translation3", Arrays.asList(), Arrays.asList(RESOURCE_BUNDLE.getString("error.bundle.empty_source"))),
                arguments(null, "format4", Arrays.asList("src1"), null, "translation3", Arrays.asList(), Arrays.asList(RESOURCE_BUNDLE.getString("error.bundle.empty_name")))
        );
    }
}
