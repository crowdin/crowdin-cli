package com.crowdin.cli.client;

import com.crowdin.client.languages.model.Language;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class CrowdinProjectInfo {

    private Long projectId;
    private String sourceLanguageId;
    private Access accessLevel;
    private Language inContextLanguage;
    private LanguageMapping languageMapping;
    private List<Language> projectLanguages;
    private boolean skipUntranslatedFiles;

    CrowdinProjectInfo() {

    }

    void setProjectId(Long projectId) {
        this.projectId = projectId;
    }

    public Long getProjectId() {
        return this.projectId;
    }

    public String getSourceLanguageId() {
        return sourceLanguageId;
    }

    public void setSourceLanguageId(String sourceLanguageId) {
        this.sourceLanguageId = sourceLanguageId;
    }

    void setAccessLevel(Access accessLevel) {
        this.accessLevel = accessLevel;
    }

    public boolean isManagerAccess() {
        return accessLevel == Access.MANAGER;
    }

    void setInContextLanguage(Language inContextLanguage) {
        this.inContextLanguage = inContextLanguage;
    }

    protected Optional<Language> getInContextLanguage() {
        return Optional.ofNullable(inContextLanguage);
    }

    public boolean getSkipUntranslatedFiles() {
        return skipUntranslatedFiles;
    }

    public void setSkipUntranslatedFiles(boolean skipUntranslatedFiles) {
        this.skipUntranslatedFiles = skipUntranslatedFiles;
    }

    void setLanguageMapping(LanguageMapping languageMapping) {
        this.languageMapping = languageMapping;
    }

    /**
     * Should be checked with isManagerAccess
     * @return language mapping
     */
    public LanguageMapping getLanguageMapping() {
        return this.languageMapping;
    }

    void setProjectLanguages(List<Language> projectLanguages) {
        this.projectLanguages = projectLanguages;
    }

    public List<Language> getProjectLanguages(boolean withInContextLang) {
        if (withInContextLang) {
            List<Language> projectLanguagesWithPseudo = new ArrayList<>(projectLanguages);
            this.getInContextLanguage()
                .ifPresent(projectLanguagesWithPseudo::add);
            return projectLanguagesWithPseudo;
        } else {
            return projectLanguages;
        }
    }

    public enum Access {
        TRANSLATOR, MANAGER;
    }

}
