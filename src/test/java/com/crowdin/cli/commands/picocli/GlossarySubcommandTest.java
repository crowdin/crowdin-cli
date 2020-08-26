package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

public class GlossarySubcommandTest extends PicocliTestUtils {

    @Test
    public void testGlossary() {
        this.executeHelp(CommandNames.GLOSSARY);
    }
}
