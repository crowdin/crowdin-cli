package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;


import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

public class CommentResolveSubcommandTest extends PicocliTestUtils {

    @Test
    public void testCommentResolve() {
        this.execute(CommandNames.COMMENT, CommandNames.COMMENT_RESOLVE, "1");
        verify(actionsMock).resolve(any());
        this.check(true);
    }

    @Test
    public void testCommentResolveInvalidOptions() {
        this.executeInvalidParams(CommandNames.COMMENT, CommandNames.COMMENT_RESOLVE, "incorrectId");
    }

    @Test
    public void testSubCommandCheckValidOptions() {
        CommentResolveSubcommand commentResolveSubcommand = new CommentResolveSubcommand();
        commentResolveSubcommand.id = 1l;
        List<String> errors = commentResolveSubcommand.checkOptions();
        assertTrue(errors.isEmpty());
    }
}
