package com.crowdin.cli.client;

import java.util.List;
import java.util.Optional;

public class CrowdinProjectInfo {

    private Long projectId;
    private Access accessLevel;
    private String inContextLanguageId;
    private LanguageMapping languageMapping;
    private List<String> targetLanguageIds;

    CrowdinProjectInfo() {

    }

    void setProjectId(Long projectId) {
        this.projectId = projectId;
    }

    public Long getProjectId() {
        return this.projectId;
    }

    void setAccessLevel(Access accessLevel) {
        this.accessLevel = accessLevel;
    }

    public boolean isManagerAccess() {
        return accessLevel == Access.MANAGER;
    }

    void setInContextLanguageId(String inContextLanguageId) {
        this.inContextLanguageId = inContextLanguageId;
    }

    protected Optional<String> getInContextLanguageId() {
        return Optional.ofNullable(inContextLanguageId);
    }

    void setLanguageMapping(LanguageMapping languageMapping) {
        this.languageMapping = languageMapping;
    }

    public LanguageMapping getLanguageMapping() {
        return this.languageMapping;
    }

    void setTargetLanguageIds(List<String> targetLanguageIds) {
        this.targetLanguageIds = targetLanguageIds;
    }

    List<String> getTargetLanguageIds() {
        return this.targetLanguageIds;
    }

    public enum Access {
        TRANSLATOR, MANAGER;
    }

}
