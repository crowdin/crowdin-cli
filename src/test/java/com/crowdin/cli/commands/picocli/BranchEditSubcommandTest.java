package com.crowdin.cli.commands.picocli;

import com.crowdin.client.core.model.Priority;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.verify;

public class BranchEditSubcommandTest extends PicocliTestUtils {

    @Test
    public void testBranchEdit() {
        String branchName = "main";
        Priority priority = Priority.HIGH;
        this.execute(CommandNames.BRANCH, CommandNames.EDIT, branchName, "--priority", priority.name());
        verify(actionsMock)
                .branchEdit(branchName, null, null, priority, null, false, false);
        this.check(true);
    }

    @Test
    public void testBranchEditInvalidOptions() {
        this.executeInvalidParams(CommandNames.BRANCH, CommandNames.EDIT);
    }

    @Test
    public void testBranchEditInvalidOptions2() {
        this.executeInvalidParams(CommandNames.BRANCH, CommandNames.EDIT, "--name", "test");
    }
}