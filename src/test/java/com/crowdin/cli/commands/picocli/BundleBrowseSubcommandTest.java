package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

public class BundleBrowseSubcommandTest extends PicocliTestUtils {

    @Test
    public void testBundleBrowseInvalidOptions() {
        this.executeInvalidParams(CommandNames.BUNDLE, CommandNames.BROWSE);
    }

    @Test
    public void testProjectBrowse() {
        this.execute(CommandNames.BUNDLE, CommandNames.BROWSE, "1");
        verify(actionsMock).bundleBrowse(any());
        this.check(true);
    }
}
