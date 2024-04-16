package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.verify;

public class ProjectListSubcommandTest extends PicocliTestUtils {

    @Test
    public void testProjectList() {
        this.execute(CommandNames.PROJECT, CommandNames.LIST);
        verify(actionsMock).projectList(false);
        this.check(true);
    }

}
