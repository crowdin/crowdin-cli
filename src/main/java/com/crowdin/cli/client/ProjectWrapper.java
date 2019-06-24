package com.crowdin.cli.client;

import com.crowdin.cli.utils.EntityUtils;
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

    public String getProjectId() {
        return this.project.getId().toString();
    }

    public Optional<Language> getProjectLanguageByCrowdinCode(String crowdinCode) {
        Optional<Language> supportedLangByCode = EntityUtils.find(supportedLanguages, byCrowdinCode(crowdinCode));

        if (!supportedLangByCode.isPresent()) return Optional.empty();

        return EntityUtils.find(projectLanguages, byCrowdinCode(crowdinCode));
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

    public List<Language> getProjectLanguages() {
        return projectLanguages;
    }


    public List<FileEntity> getFiles() {
        return files;
    }

    public List<Directory> getDirectories() {
        return directories;
    }
}
