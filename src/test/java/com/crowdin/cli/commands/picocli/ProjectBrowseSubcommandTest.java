package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.verify;

public class ProjectBrowseSubcommandTest extends PicocliTestUtils {

    @Test
    public void testProjectBrowse() {
        this.execute(CommandNames.PROJECT, CommandNames.BROWSE);
        verify(actionsMock).projectBrowse();
        this.check(true);
    }

}
