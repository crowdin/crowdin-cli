package com.crowdin.cli.utils;

import com.crowdin.common.models.Language;

public enum LanguageBuilder {
    UKR("Ukrainian", "ua", "ukr", "uk-UA", "uk_", "uk", "uk"),
    RUS("Russian", "ru", "rus", "ru-RU", "ru_", "ru", "ru"),
    DEU("Deutsch","de","deu", "de-DE", "de_", "de", "de"),
    ENG("English", "en", "eng", "en-GB", "en_001", "en", "en");

    private Language lang;

    LanguageBuilder(String name,
                    String twoLettersCode,
                    String threeLettersCode,
                    String locale,
                    String androidCode,
                    String osxLocale,
                    String osxCode) {
        lang = new Language();
        lang.setName(name);
        lang.setTwoLettersCode(twoLettersCode);
        lang.setThreeLettersCode(threeLettersCode);
        lang.setLocale(locale);
        lang.setAndroidCode(androidCode);
        lang.setOsxLocale(osxLocale);
        lang.setOsxCode(osxCode);
    }

    public Language build() {
        return lang;
    }
}
