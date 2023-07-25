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
        this.executeInvalidParams(CommandNames.DISTRIBUTION, CommandNames.DISTRIBUTION_ADD, "Test Distribution1", "--file", "stringId");
    }

    @ParameterizedTest
    @MethodSource
    public void testSubCommandCheckValidOptions(String name, ExportMode exportMode, List<String> files) {
        DistributionAddSubcommand distributionAddSubcommand = new DistributionAddSubcommand();
        distributionAddSubcommand.name = name;
        distributionAddSubcommand.exportMode = exportMode;
        distributionAddSubcommand.files = files;

        List<String> errors = distributionAddSubcommand.checkOptions();
        assertEquals(Collections.emptyList(), errors);
    }

    public static Stream<Arguments> testSubCommandCheckValidOptions() {
        return Stream.of(
            arguments("Distribution 1", ExportMode.DEFAULT, Arrays.asList("strings.xml", "strings2.xml")),
            arguments("Distribution 2", ExportMode.BUNDLE, Arrays.asList("strings.xml", "strings2.xml")),
            arguments("Distribution 3", null, Arrays.asList("strings.xml", "strings2.xml")));
    }

    @ParameterizedTest
    @MethodSource
    public void testSubCommandCheckInvalidOptions(String name, ExportMode exportMode, List<String> files, List<String> expErrors) {
        DistributionAddSubcommand distributionAddSubcommand = new DistributionAddSubcommand();
        distributionAddSubcommand.name = name;
        distributionAddSubcommand.exportMode = exportMode;
        distributionAddSubcommand.files = files;

        List<String> errors = distributionAddSubcommand.checkOptions();
        assertThat(errors, Matchers.equalTo(expErrors));
    }

    public static Stream<Arguments> testSubCommandCheckInvalidOptions() {
        return Stream.of(
            arguments("Distribution 1", ExportMode.DEFAULT, null, Arrays.asList(RESOURCE_BUNDLE.getString("error.distribution.empty_fileId"))));
    }
}
