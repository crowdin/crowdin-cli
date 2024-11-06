package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

class BundleBrowseSubcommandTest extends PicocliTestUtils {
    @Test
    public void testProjectBrowse() {
        this.execute(CommandNames.BUNDLE, CommandNames.BROWSE, "1");
        verify(actionsMock).bundleBrowse(any(), any());
        this.check(true);
    }
}
