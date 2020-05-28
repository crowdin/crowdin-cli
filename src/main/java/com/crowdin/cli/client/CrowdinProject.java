package com.crowdin.cli.client;

import com.crowdin.client.languages.model.Language;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.File;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

public class CrowdinProject implements Project {

    private long projectId;
    private List<File> files;
    private List<Directory> directories;
    private List<Branch> branches;
    private List<Language> supportedLanguages;
    private List<Language> projectLanguages;

    private Map<String, Map<String, String>> languageMapping;
    private String pseudoLanguageId;

    private boolean isManagerAccess;

    public long getProjectId() {
        return projectId;
    }

    public void setProjectId(long projectId) {
        this.projectId = projectId;
    }

    public void setFiles(List<File> files) {
        this.files = files;
    }

    public void setDirectories(List<Directory> directories) {
        this.directories = directories;
    }

    public void setBranches(List<Branch> branches) {
        this.branches = branches;
    }

    public void setSupportedLanguages(List<Language> supportedLanguages) {
        this.supportedLanguages = supportedLanguages;
    }

    public void setProjectLanguages(List<Language> projectLanguages) {
        this.projectLanguages = projectLanguages;
    }

    public void setLanguageMapping(Map<String, Map<String, String>> languageMapping) {
        this.languageMapping = languageMapping;
    }

    public void setPseudoLanguageId(String pseudoLanguageId) {
        this.pseudoLanguageId = pseudoLanguageId;
    }

    public void setManagerAccess(boolean isManagerAccess) {
        this.isManagerAccess = isManagerAccess;
    }

    private Optional<Language> getPseudoLanguage() {
        return (pseudoLanguageId != null)
            ? this.findLanguage(pseudoLanguageId, false)
            : Optional.empty();
    }

    @Override
    public Optional<Language> findLanguage(String id, boolean inProjectLanguages) {
        return ((inProjectLanguages) ? this.projectLanguages : this.supportedLanguages).stream()
            .filter(lang -> lang.getId().equals(id))
            .findFirst();
    }

    @Override
    public Map<Long, Branch> getBranches() {
        return this.branches
            .stream()
            .collect(Collectors.toMap(Branch::getId, Function.identity()));
    }

    @Override
    public void addBranchToList(Branch branch) {
        this.branches.add(branch);
    }

    @Override
    public Optional<Branch> findBranch(String branchName) {
        return branches
            .stream()
            .filter(branch -> branch.getName().equals(branchName))
            .findFirst();
    }

    @Override
    public List<Language> getSupportedLanguages() {
        return supportedLanguages;
    }

    @Override
    public List<Language> getProjectLanguages(boolean withPseudoLang) {
        if (withPseudoLang) {
            List<Language> projectLanguagesWithPseudo = new ArrayList<>(projectLanguages);
            getPseudoLanguage().ifPresent(projectLanguagesWithPseudo::add);
            return projectLanguagesWithPseudo;
        } else {
            return projectLanguages;
        }
    }

    @Override
    public Map<Long, Directory> getDirectories() {
        return directories
            .stream()
            .collect(Collectors.toMap(Directory::getId, Function.identity()));
    }

    @Override
    public Optional<File> findFile(String name, Long directoryId, Long branchId) {
        return files.stream()
            .filter(file -> Objects.equals(file.getName(), name))
            .filter(file -> Objects.equals(file.getDirectoryId(), directoryId))
            .filter(file -> Objects.equals(file.getBranchId(), branchId))
            .findFirst();
    }

    @Override
    public List<File> getFiles() {
        return files;
    }

    @Override
    public Optional<Map<String, Map<String, String>>> getLanguageMapping() {
        return Optional.ofNullable(this.languageMapping);
    }

    @Override
    public boolean isManagerAccess() {
        return isManagerAccess;
    }
}
