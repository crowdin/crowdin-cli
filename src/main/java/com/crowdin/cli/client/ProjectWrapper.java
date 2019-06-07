package com.crowdin.cli.client;

import com.crowdin.cli.utils.EntityUtil;
import com.crowdin.common.models.Directory;
import com.crowdin.common.models.FileEntity;
import com.crowdin.common.models.Language;
import com.crowdin.common.models.Project;

import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;


public class ProjectWrapper {

    private Project project;
    private List<FileEntity> files;
    private List<Directory> directories;
    private List<Language> supportedLanguages;
    private List<Language> projectLanguages;

    ProjectWrapper(Project project,
                   List<FileEntity> files,
                   List<Directory> directories, List<Language> supportedLanguages,
                   List<Language> projectLanguages) {
        this.project = project;
        this.files = files;
        this.directories = directories;
        this.supportedLanguages = supportedLanguages;
        this.projectLanguages = projectLanguages;
    }

    public Optional<Language> getProjectLanguageByCrowdinCode(String crowdinCode) {
        Optional<Language> supportedLangByCode = EntityUtil.find(byCrowdinCode(crowdinCode), supportedLanguages);

        if (!supportedLangByCode.isPresent()) return Optional.empty();

        return EntityUtil.find(byCrowdinCode(crowdinCode), projectLanguages);
    }

    public Optional<Language> getProjectLanguageByCrowdinName(String name) {
        Optional<Language> supportedLangByCode = EntityUtil.find(byNamePredicate(name), supportedLanguages);

        if (!supportedLangByCode.isPresent()) return Optional.empty();

        return EntityUtil.find(byNamePredicate(name), projectLanguages);
    }

    public static Predicate<Language> byNamePredicate(String name) {
        return language -> language.getName().equalsIgnoreCase(name);
    }

    public static Predicate<Language> byCrowdinCode(String crowdinCode) {
        return language -> language.getCrowdinCode().equalsIgnoreCase(crowdinCode);
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public List<Language> getSupportedLanguages() {
        return supportedLanguages;
    }

    public void setSupportedLanguages(List<Language> supportedLanguages) {
        this.supportedLanguages = supportedLanguages;
    }

    public List<Language> getProjectLanguages() {
        return projectLanguages;
    }

    public void setProjectLanguages(List<Language> projectLanguages) {
        this.projectLanguages = projectLanguages;
    }

    public List<FileEntity> getFiles() {
        return files;
    }

    public void setFiles(List<FileEntity> files) {
        this.files = files;
    }

    public List<Directory> getDirectories() {
        return directories;
    }

    public void setDirectories(List<Directory> directories) {
        this.directories = directories;
    }
}
