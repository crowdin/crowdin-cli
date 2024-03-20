package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

class LabelListSubcommandTest extends PicocliTestUtils {

    @Test
    public void testLabelList() {
        this.execute(CommandNames.LABEL, CommandNames.LIST);
        verify(actionsMock).labelList(anyBoolean(), anyBoolean());
        this.check(true);
    }
}
