package com.crowdin.cli.client;

import com.crowdin.client.languages.model.Language;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class CrowdinProject extends CrowdinProjectInfo {

    private List<Language> supportedLanguages;
    private List<Language> projectLanguages;

    CrowdinProject() {

    }

    void setSupportedLanguages(List<Language> supportedLanguages) {
        this.supportedLanguages = supportedLanguages;
    }

    public List<Language> getSupportedLanguages() {
        return this.supportedLanguages;
    }

    void setProjectLanguages(List<Language> projectLanguages) {
        this.projectLanguages = projectLanguages;
    }

    public List<Language> getProjectLanguages(boolean withInContextLang) {
        if (withInContextLang) {
            List<Language> projectLanguagesWithPseudo = new ArrayList<>(projectLanguages);
            this.getInContextLanguageId()
                .flatMap(id -> this.findLanguageById(id, false))
                .ifPresent(projectLanguagesWithPseudo::add);
            return projectLanguagesWithPseudo;
        } else {
            return projectLanguages;
        }
    }

    public Optional<Language> findLanguageById(String langId, boolean onlyProjLangs) {
        return ((onlyProjLangs) ? this.getProjectLanguages(true) : this.getSupportedLanguages())
            .stream()
            .filter(lang -> lang.getId().equals(langId))
            .findFirst();
    }
}
