package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class GlossaryListSubcommandTest extends PicocliTestUtils {

    @Test
    public void testGlossaryList() {
        this.execute(CommandNames.GLOSSARY, CommandNames.GLOSSARY_LIST);
        verify(actionsMock)
            .glossaryList(anyBoolean(), anyBoolean());
        check(true);
    }
}
