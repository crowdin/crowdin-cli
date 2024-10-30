package com.crowdin.cli.commands.picocli;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static com.crowdin.cli.commands.picocli.GenericCommand.RESOURCE_BUNDLE;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

class DownloadTranslationsSubcommandTest extends PicocliTestUtils {

    @Test
    public void testDownload() {
        this.execute(CommandNames.DOWNLOAD, CommandNames.TRANSLATIONS, "--debug");
        verify(actionsMock)
            .download(any(), anyBoolean(), any(), any(), anyBoolean(), any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }

    @Test
    public void testDownloadDryrun() {
        this.execute(CommandNames.DOWNLOAD, CommandNames.TRANSLATIONS, "--dryrun");
        verify(actionsMock)
            .listTranslations(anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }

    @Test
    public void testSubCommandCheckInvalidOptions() {
        DownloadTranslationsSubcommand downloadSubcommand = new DownloadTranslationsSubcommand();
        downloadSubcommand.languageIds = Arrays.asList("uk", "es-ES");
        downloadSubcommand.excludeLanguageIds = Arrays.asList("en");
        List<String> errors = downloadSubcommand.checkOptions();
        assertThat(errors, Matchers.equalTo(Arrays.asList(RESOURCE_BUNDLE.getString("error.download.include_exclude_lang_conflict"))));
    }
}