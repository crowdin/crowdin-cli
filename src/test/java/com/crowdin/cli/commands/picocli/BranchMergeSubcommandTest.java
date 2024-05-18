package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

class BranchMergeSubcommandTest extends PicocliTestUtils {

    @Test
    public void testBranchMerge() {
        this.execute(CommandNames.BRANCH, CommandNames.BRANCH_MERGE, "main", "dev");
        verify(actionsMock).branchMerge(any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }
}