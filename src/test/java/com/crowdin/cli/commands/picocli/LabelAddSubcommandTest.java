package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

class LabelAddSubcommandTest extends PicocliTestUtils {

    @Test
    public void testLabelAdd() {
        this.execute(CommandNames.LABEL, CommandNames.LABEL_ADD, "label");
        verify(actionsMock).labelAdd(any(), anyBoolean());
        this.check(true);
    }

    @Test
    public void testLabelAddInvalidOptions() {
        this.executeInvalidParams(CommandNames.LABEL, CommandNames.LABEL_ADD);
    }
}
