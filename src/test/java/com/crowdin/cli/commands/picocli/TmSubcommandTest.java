package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

public class TmSubcommandTest extends PicocliTestUtils {

    @Test
    public void testTm() {
        this.executeHelp(CommandNames.TM);
    }

}
