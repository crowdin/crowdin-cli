package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

class LabelDeleteSubcommandTest extends PicocliTestUtils {

    @Test
    public void testLabelDelete() {
        this.execute(CommandNames.LABEL, CommandNames.DELETE, "label");
        verify(actionsMock).labelDelete(any());
        this.check(true);
    }

    @Test
    public void testLabelDeleteInvalidOptions() {
        this.executeInvalidParams(CommandNames.LABEL, CommandNames.DELETE);
    }
}
