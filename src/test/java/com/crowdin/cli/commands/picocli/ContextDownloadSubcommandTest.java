package com.crowdin.cli.commands.picocli;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.List;
import java.util.stream.Stream;

import static com.crowdin.cli.commands.picocli.GenericCommand.RESOURCE_BUNDLE;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class ContextDownloadSubcommandTest extends PicocliTestUtils {

    @Test
    public void testContextDownload() {
        this.execute(CommandNames.CONTEXT, CommandNames.CONTEXT_DOWNLOAD, "some/path/to/file.jsonl");
        verify(actionsMock).contextDownload(any(), any(), any(), any(), any(), any(), any(), any(), any(), anyBoolean(), anyBoolean());
        this.check(true);
    }

    @Test
    public void testContextDownloadInvalid() {
        this.executeInvalidParams(CommandNames.CONTEXT, CommandNames.CONTEXT_DOWNLOAD);
    }

    @ParameterizedTest
    @MethodSource
    public void testContextDownloadInvalidOptions(String since, String format, String status, List<String> expErrors) {
        ContextDownloadSubcommand subcommand = new ContextDownloadSubcommand();
        subcommand.since = since;
        subcommand.format = format;
        subcommand.status = status;

        List<String> errors = subcommand.checkOptions();
        assertThat(errors, Matchers.equalTo(expErrors));
    }

    public static Stream<Arguments> testContextDownloadInvalidOptions() {
        return Stream.of(
                arguments("2020-12-01", "jsonl", "ai", List.of()),
                arguments("invalid", "text", "invalid", List.of(RESOURCE_BUNDLE.getString("error.context.invalid_since"), RESOURCE_BUNDLE.getString("error.context.invalid_format"), RESOURCE_BUNDLE.getString("error.context.invalid_status"))),
                arguments("invalid", "text", null, List.of(RESOURCE_BUNDLE.getString("error.context.invalid_since"), RESOURCE_BUNDLE.getString("error.context.invalid_format"))),
                arguments(null, "text", null, List.of(RESOURCE_BUNDLE.getString("error.context.invalid_format")))
        );
    }
}
