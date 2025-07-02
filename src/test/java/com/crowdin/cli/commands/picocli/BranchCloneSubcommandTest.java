package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

class BranchCloneSubcommandTest extends PicocliTestUtils {

    @Test
    public void testBranchClone() {
        this.execute(CommandNames.BRANCH, CommandNames.CLONE, "main", "clone");
        verify(actionsMock).branchClone(any(), any(), anyBoolean(), anyBoolean());
        this.check(true);
    }
}