package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

class BundleCloneSubcommandTest extends PicocliTestUtils {

    @Test
    public void testBundleClone() {
        this.execute(CommandNames.BUNDLE, CommandNames.CLONE, "1");
        verify(actionsMock)
            .bundleClone(any(), any(), any(), any(), any(), any(), any(), anyBoolean(), any(), any(), any());
        this.check(true);
    }
}