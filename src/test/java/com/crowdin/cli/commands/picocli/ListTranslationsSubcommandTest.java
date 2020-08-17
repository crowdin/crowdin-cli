package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class ListTranslationsSubcommandTest extends PicocliTestUtils {

    @Test
    public void testListTranslations() {
        this.execute(CommandNames.LIST, CommandNames.LIST_TRANSLATIONS);
        verify(actionsMock)
            .listTranslations(anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }
}
