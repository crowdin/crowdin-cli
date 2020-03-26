package com.crowdin.cli.utils;

import com.crowdin.common.models.Language;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public enum PlaceholderUtilBuilder {
    STANDART(
            new LanguageBuilder[] { LanguageBuilder.DEU, LanguageBuilder.ENG, LanguageBuilder.ENG, LanguageBuilder.ENG },
            new LanguageBuilder[] { LanguageBuilder.UKR, LanguageBuilder.ENG });

    private List<Language> supportedLanguages = new ArrayList<>();
    private List<Language> projectLanguages = new ArrayList<>();

    PlaceholderUtilBuilder(LanguageBuilder[] supportedLanguagesArray, LanguageBuilder[] projectLanguagesArray) {
        Arrays.stream(supportedLanguagesArray)
                .map(LanguageBuilder::build)
                .forEach(supportedLanguages::add);
        Arrays.stream(projectLanguagesArray)
                .map(LanguageBuilder::build)
                .forEach(projectLanguages::add);
    }

    public PlaceholderUtil build(String basePath) {
        return new PlaceholderUtil(supportedLanguages, projectLanguages, basePath);
    }
}
