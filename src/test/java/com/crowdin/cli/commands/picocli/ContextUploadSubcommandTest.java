package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

public class ContextUploadSubcommandTest extends PicocliTestUtils {

    @Test
    public void testContextUploadInvalid() {
        this.executeInvalidParams(CommandNames.CONTEXT, CommandNames.UPLOAD);
    }
}
