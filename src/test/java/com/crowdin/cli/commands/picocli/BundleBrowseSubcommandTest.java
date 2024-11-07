package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

public class BundleBrowseSubcommandTest extends PicocliTestUtils {

    @Test
    public void testBundleBrowseInvalidOptions() {
        this.executeInvalidParams(CommandNames.BUNDLE, CommandNames.BROWSE);
    }
}
