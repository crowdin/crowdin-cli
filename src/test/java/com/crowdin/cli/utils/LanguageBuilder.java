package com.crowdin.cli.utils;

import com.crowdin.common.models.Language;

public enum LanguageBuilder {
    UKR("Ukrainian", "ua", "ukr", "uk-UA"),
    RUS("Russian", "ru", "rus", "ru-RU"),
    DEU("Deutsch","de","deu", "de-DE"),
    ENG("English", "en", "eng", "en-GB");

    private Language lang;

    LanguageBuilder(String name, String twoLettersCode, String threeLettersCode, String locale) {
        lang = new Language();
        lang.setName(name);
        lang.setTwoLettersCode(twoLettersCode);
        lang.setThreeLettersCode(threeLettersCode);
        lang.setLocale(locale);
        lang.setAndroidCode("to-do-later");
        lang.setOsxLocale("to-do-later");
        lang.setOsxCode("to-do-later");
    }

    public Language build() {
        return lang;
    }
}
