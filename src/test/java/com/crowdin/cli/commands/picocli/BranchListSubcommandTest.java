package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class BranchListSubcommandTest extends PicocliTestUtils {

    @Test
    public void testListBranches() {
        this.execute(CommandNames.BRANCH, CommandNames.LIST);
        verify(actionsMock)
            .listBranches(anyBoolean(), anyBoolean());
        this.check(true);
    }
}
