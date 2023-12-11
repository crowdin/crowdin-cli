package com.crowdin.cli.commands.picocli;

import com.crowdin.client.distributions.model.ExportMode;
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

public class DistributionAddSubcommandTest extends PicocliTestUtils {

    @Test
    public void testDistributionAddInvalidOptions() {
        this.executeInvalidParams(CommandNames.DISTRIBUTION, CommandNames.DISTRIBUTION_ADD, "Test Distribution1", "--file", null);
    }

    @ParameterizedTest
    @MethodSource
    public void testSubCommandCheckValidOptions(String name, ExportMode exportMode, List<String> files, List<Integer> bundleIds) {
        DistributionAddSubcommand distributionAddSubcommand = new DistributionAddSubcommand();
        distributionAddSubcommand.name = name;
        distributionAddSubcommand.exportMode = exportMode;
        distributionAddSubcommand.files = files;
        distributionAddSubcommand.bundleIds = bundleIds;

        List<String> errors = distributionAddSubcommand.checkOptions();
        assertEquals(Collections.emptyList(), errors);
    }

    public static Stream<Arguments> testSubCommandCheckValidOptions() {
        return Stream.of(
            arguments("Distribution 1", ExportMode.DEFAULT, Arrays.asList("strings.xml", "strings2.xml"), null),
            arguments("Distribution 2", ExportMode.BUNDLE, null, Arrays.asList(1l, 2l)),
            arguments("Distribution 3", null, Arrays.asList("strings.xml", "strings2.xml"), null));
    }

    @ParameterizedTest
    @MethodSource
    public void testSubCommandCheckInvalidOptions(String name, ExportMode exportMode, List<String> files,
                                                  List<Integer> bundleIds, List<String> expErrors) {
        DistributionAddSubcommand distributionAddSubcommand = new DistributionAddSubcommand();
        distributionAddSubcommand.name = name;
        distributionAddSubcommand.exportMode = exportMode;
        distributionAddSubcommand.files = files;
        distributionAddSubcommand.bundleIds = bundleIds;

        List<String> errors = distributionAddSubcommand.checkOptions();
        assertThat(errors, Matchers.equalTo(expErrors));
    }

    public static Stream<Arguments> testSubCommandCheckInvalidOptions() {
        return Stream.of(
            arguments("Distribution 1", ExportMode.DEFAULT, null, null, Arrays.asList(RESOURCE_BUNDLE.getString("error.distribution.empty_file"))),
            arguments("Distribution 2", ExportMode.BUNDLE, null, null, Arrays.asList(RESOURCE_BUNDLE.getString("error.distribution.empty_bundle_ids"))),
            arguments("Distribution 3", ExportMode.BUNDLE, Arrays.asList("file.json"), Arrays.asList(1l), Arrays.asList(RESOURCE_BUNDLE.getString("error.distribution.incorrect_file_command_usage"))),
            arguments("Distribution 4", ExportMode.DEFAULT, Arrays.asList("file.json"), Arrays.asList(1l), Arrays.asList(RESOURCE_BUNDLE.getString("error.distribution.incorrect_bundle_id_command_usage")))
        );
    }
}
