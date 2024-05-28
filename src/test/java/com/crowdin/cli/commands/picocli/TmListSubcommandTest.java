package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

public class TmListSubcommandTest extends PicocliTestUtils {

    @Test
    public void testTmList() {
        this.execute(CommandNames.TM, CommandNames.LIST);
        verify(actionsMock).tmList(eq(false));
        this.check(true);
    }
}
