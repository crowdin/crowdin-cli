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

public class DistributionEditSubcommandTest extends PicocliTestUtils {

    @Test
    public void testDistributionEditInvalidOptions() {
        this.executeInvalidParams(CommandNames.DISTRIBUTION, CommandNames.EDIT, "hash");
    }

    @ParameterizedTest
    @MethodSource
    public void testSubCommandCheckValidOptions(String hash, String name, ExportMode exportMode, List<String> files, List<Integer> bundleIds) {
        DistributionEditSubcommand distributionEditSubcommand = new DistributionEditSubcommand();
        distributionEditSubcommand.hash = hash;
        distributionEditSubcommand.name = name;
        distributionEditSubcommand.exportMode = exportMode;
        distributionEditSubcommand.files = files;
        distributionEditSubcommand.bundleIds = bundleIds;

        List<String> errors = distributionEditSubcommand.checkOptions();
        assertEquals(Collections.emptyList(), errors);
    }

    public static Stream<Arguments> testSubCommandCheckValidOptions() {
        return Stream.of(
            arguments("hash0", null, null, Arrays.asList("strings.xml", "strings2.xml"), null),
            arguments("hash1", null, ExportMode.DEFAULT, null, null),
            arguments("hash2", null, ExportMode.BUNDLE, null, Arrays.asList(1l, 2l)),
            arguments("hash3", "Distribution1", null, null, null));
    }
}
