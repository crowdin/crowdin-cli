package com.crowdin.cli.client;

import com.crowdin.client.languages.model.Language;

import java.util.List;
import java.util.Optional;

public class CrowdinProject extends CrowdinProjectInfo {

    private List<Language> supportedLanguages;

    CrowdinProject() {

    }

    void setSupportedLanguages(List<Language> supportedLanguages) {
        this.supportedLanguages = supportedLanguages;
    }

    public List<Language> getSupportedLanguages() {
        return this.supportedLanguages;
    }

    public Optional<Language> findLanguageById(String langId, boolean onlyProjLangs) {
        return ((onlyProjLangs) ? this.getProjectLanguages(true) : this.getSupportedLanguages())
            .stream()
            .filter(lang -> lang.getId().equals(langId))
            .findFirst();
    }
}
