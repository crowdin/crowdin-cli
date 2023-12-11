package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class CommentListSubcommandTest extends PicocliTestUtils {

    @Test
    public void testCommentList() {
        this.execute(CommandNames.COMMENT, CommandNames.COMMENT_LIST);
        verify(actionsMock)
            .commentList(anyBoolean(), anyBoolean(), any(), any(), any(), any());
        this.check(true);
    }
}
