package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class ConfigTranslationsSubcommandTest extends PicocliTestUtils {

    @Test
    public void testListTranslations() {
        this.execute(CommandNames.CONFIG, CommandNames.TRANSLATIONS);
        verify(actionsMock)
            .listTranslations(anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }
}
