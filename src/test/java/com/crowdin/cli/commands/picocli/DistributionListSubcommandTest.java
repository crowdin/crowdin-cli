package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class DistributionListSubcommandTest extends PicocliTestUtils {

    @Test
    public void testDistributionList() {
        this.execute(CommandNames.DISTRIBUTION, CommandNames.DISTRIBUTION_LIST);
        verify(actionsMock)
            .distributionList(anyBoolean());
        this.check(true);
    }
}
