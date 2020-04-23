package com.crowdin.cli.client;

import com.crowdin.client.api.LanguagesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Language;

import java.util.List;

public class LanguagesClient extends ClientOld {

    public LanguagesClient(Settings settings) {
        super(settings);
    }

    public List<Language> getAllSupportedLanguages() {
        return executePage((new LanguagesApi(settings)).getLanguages(null));
    }

    public Language getLanguage(String languageId) {
        return execute((new LanguagesApi(settings)).getLanguage(languageId));
    }
}
