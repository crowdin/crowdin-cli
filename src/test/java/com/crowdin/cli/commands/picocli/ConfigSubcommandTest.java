package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

public class ConfigSubcommandTest extends PicocliTestUtils {

    @Test
    public void testList() {
        this.executeHelp(CommandNames.CONFIG);
    }
}
