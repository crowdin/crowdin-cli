package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

public class StringSubcommandTest extends PicocliTestUtils {

    @Test
    public void testString() {
        this.executeHelp(CommandNames.STRING);
    }
}