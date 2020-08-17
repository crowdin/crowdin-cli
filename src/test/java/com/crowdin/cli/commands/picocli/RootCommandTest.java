package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

public class RootCommandTest extends PicocliTestUtils {

    @Test
    public void testRoot() {
        this.executeHelp();
    }
}