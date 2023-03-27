package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class BundleListSubcommandTest extends PicocliTestUtils {

    @Test
    public void testBundleList() {
        this.execute(CommandNames.BUNDLE, CommandNames.BUNDLE_LIST);
        verify(actionsMock)
            .bundleList(anyBoolean(), anyBoolean());
        this.check(true);
    }
}
