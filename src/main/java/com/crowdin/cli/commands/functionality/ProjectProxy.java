package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.client.*;
import com.crowdin.cli.client.exceptions.OrganizationNotFoundResponseException;
import com.crowdin.cli.client.exceptions.ProjectNotFoundResponseException;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.common.Settings;
import com.crowdin.common.models.*;
import com.crowdin.common.request.BranchPayload;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public class ProjectProxy {

    String projectId;
    Settings settings;

    private ProjectSettings project;
    private List<FileEntity> files;
    private List<Directory> directories;
    private List<Language> supportedLanguages;
    private List<Branch> branches;

    public ProjectProxy(String projectId, Settings settings) {
        this.projectId = projectId;
        this.settings = settings;
    }

    public ProjectProxy downloadProject() {
        if (this.project != null) {
            return this;
        }
        try {
            this.project = (new ProjectClient(this.settings)).getProject(this.projectId);
        } catch (OrganizationNotFoundResponseException e) {
            throw new RuntimeException("Organization not found");
        } catch (ProjectNotFoundResponseException e) {
            throw new RuntimeException("Project with id: " + projectId + " does not exist");
        } catch (ResponseException e){
            throw new RuntimeException("Unhandled Exception: " + e.getMessage());
        }
        return this;
    }

    public ProjectProxy downloadFiles() {
        if (this.files != null) {
            return this;
        }
        this.files = new FileClient(this.settings).getProjectFiles(this.projectId);
        return this;
    }

    public ProjectProxy downloadDirectories() {
        if (this.directories != null) {
            return this;
        }
        try {
            this.directories = new DirectoriesClient(this.settings, this.projectId).getProjectDirectories();
        } catch (ResponseException e) {
            throw new RuntimeException("Couldn't get list of directories", e);
        }
        return this;
    }

    public ProjectProxy downloadSupportedLanguages() {
        if (this.supportedLanguages != null) {
            return this;
        }
        this.supportedLanguages = new LanguagesClient(this.settings).getAllSupportedLanguages();
        return this;
    }

    public ProjectProxy downloadBranches() {
        if (this.branches != null) {
            return this;
        }
        this.branches = new BranchClient(this.settings).getAllSupportedBranches(this.projectId);
        return this;
    }

    public List<FileEntity> getFiles() {
        if (files == null) {
            this.downloadFiles();
        }
        return files;
    }

    public List<Directory> getDirectories() {
        if (directories == null) {
            this.downloadDirectories();
        }
        return directories;
    }

    public Map<Long, Directory> getMapDirectories() {
        if (directories == null) {
            this.downloadDirectories();
        }
        return directories
            .stream()
            .collect(Collectors.toMap(Directory::getId, Function.identity()));
    }

    public List<Language> getSupportedLanguages() {
        if (supportedLanguages == null) {
            this.downloadSupportedLanguages();
        }
        return supportedLanguages;
    }

    public List<Language> getProjectLanguages() {
        if (this.project == null) {
            this.downloadProject();
        }
        if (this.supportedLanguages == null) {
            this.downloadSupportedLanguages();
        }
        List<Language> projectLanguages = supportedLanguages.stream()
            .filter(language -> project.getTargetLanguageIds().contains(language.getId()))
            .collect(Collectors.toList());

        this.getPseudoLanguage().ifPresent(projectLanguages::add);
        return projectLanguages;
    }

    public Optional<Language> getPseudoLanguage() {
        if (this.project == null) {
            this.downloadProject();
        }
        if (this.supportedLanguages == null) {
            this.downloadSupportedLanguages();
        }
        return (this.project.isInContext())
            ? this.getLanguageById(project.getInContextPseudoLanguageId())
            : Optional.empty();
    }

    public Optional<Language> getLanguageById(String languageId) {
        if (this.supportedLanguages == null) {
            this.downloadSupportedLanguages();
        }
        return this.supportedLanguages.stream()
            .filter(lang -> lang.getId().equals(languageId))
            .findFirst();
    }

    public Map<Long, Branch> getMapBranches() {
        if (branches == null) {
            this.downloadBranches();
        }
        return this.branches
            .stream()
            .collect(Collectors.toMap(Branch::getId, Function.identity()));
    }

    public Optional<Branch> getBranchByName(String branchName) {
        if (branches == null) {
            this.downloadBranches();
        }
        return branches
            .stream()
            .filter(branch -> branch.getName().equals(branchName))
            .findFirst();
    }

    public void addBranchToList(Branch branch) {
        this.branches.add(branch);
    }
}
