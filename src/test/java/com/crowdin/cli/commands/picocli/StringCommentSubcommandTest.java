package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class StringCommentSubcommandTest extends PicocliTestUtils {

    @Test
    public void testStringComment() {
        this.execute(CommandNames.STRING, CommandNames.STRING_COMMENT, "\"My Comment\"", "--string-id", "1",
                     "--language", "en", "--type", "comment");
        verify(actionsMock)
            .stringComment(anyBoolean(), anyBoolean(), any(), any(), any(), any(), any());
        this.check(true);
    }

    @Test
    public void testStringCommentInvalidOptions() {
        this.executeInvalidParams(CommandNames.STRING, CommandNames.STRING_COMMENT, "\"My Comment\"");
    }

}
