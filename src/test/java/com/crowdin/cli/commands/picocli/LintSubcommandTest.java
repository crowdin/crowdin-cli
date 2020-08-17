package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

public class LintSubcommandTest extends PicocliTestUtils {

    @Test
    public void testLint() {
        this.execute(CommandNames.LINT);
        verify(actionsMock).buildProperties(any(), any(), any());
        verify(propertiesBeanStepMock).act(any());
        verifyNoMoreInteractions(propertiesBeanStepMock);
        verifyNoMoreInteractions(actionsMock);
    }
}
