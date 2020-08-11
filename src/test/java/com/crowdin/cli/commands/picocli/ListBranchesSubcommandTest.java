package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class ListBranchesSubcommandTest extends PicocliTestUtils {

    @Test
    public void testListBranches() {
        this.execute(CommandNames.LIST, CommandNames.LIST_BRANCHES);
        verify(actionsMock)
            .listBranches(anyBoolean(), anyBoolean());
        this.check(true);
    }
}
