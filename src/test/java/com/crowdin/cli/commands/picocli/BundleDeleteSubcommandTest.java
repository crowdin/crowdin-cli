package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

class BundleDeleteSubcommandTest extends PicocliTestUtils {

    @Test
    public void testBundleDelete() {
        this.execute(CommandNames.BUNDLE, CommandNames.DELETE, "1");
        verify(actionsMock)
            .bundleDelete(any());
        this.check(true);
    }

}