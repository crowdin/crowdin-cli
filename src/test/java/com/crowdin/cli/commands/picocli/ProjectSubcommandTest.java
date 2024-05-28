package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

public class ProjectSubcommandTest extends PicocliTestUtils {

    @Test
    public void testString() {
        this.executeHelp(CommandNames.PROJECT);
    }
}