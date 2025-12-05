package com.crowdin.cli.client;

import com.crowdin.cli.client.models.BranchBuilder;
import com.crowdin.cli.client.models.DirectoryBuilder;
import com.crowdin.cli.client.models.FileBuilder;
import com.crowdin.cli.utils.LanguageBuilder;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.projectsgroups.model.ProjectSettings;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.File;
import com.crowdin.client.sourcefiles.model.GeneralFileExportOptions;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class ProjectBuilder {

    private ProjectSettings projectSettings;
    private CrowdinProjectFull project;
    private Map<String, Map<String, String>> languageMapping = new HashMap<>();

    private List<Directory> directories = new ArrayList<>();
    private List<File> files = new ArrayList<>();

    public static ProjectBuilder emptyProject(Long projectId) {
        ProjectBuilder projectBuilder = new ProjectBuilder();
        ProjectSettings projectSettings = buildProjectSettings(projectId);
        List<Branch> branches = new ArrayList<>();
        List<Language> supportedLanguages = new ArrayList<>();
        supportedLanguages.add(LanguageBuilder.DEU.build());
        supportedLanguages.add(LanguageBuilder.ENG.build());
        supportedLanguages.add(LanguageBuilder.RUS.build());
        supportedLanguages.add(LanguageBuilder.UKR.build());
        List<Language> projectLanguages = supportedLanguages.stream()
            .filter(language -> projectSettings.getTargetLanguageIds().contains(language.getId()))
            .collect(Collectors.toList());

        CrowdinProjectFull project = new CrowdinProjectFull();
        project.setBranches(branches);
        project.setProjectLanguages(projectLanguages);
        project.setAccessLevel(CrowdinProject.Access.MANAGER);
        projectBuilder.project = project;
        projectBuilder.projectSettings = projectSettings;
        return projectBuilder;
    }

    public ProjectBuilder addBranches(long idToStart, String... branchNames) {
        List<Branch> branches = new ArrayList<>();
        long idToStartCounter = idToStart;
        for (String branchName : branchNames) {
            Branch branch = BranchBuilder.standard().setProjectId(project.getProjectId())
                .setIdentifiers(branchName, idToStartCounter++).build();
            branches.add(branch);
        }
        project.setBranches(branches);
        return this;
    }

    public ProjectBuilder addDirectory(String name, Long id, Long directoryId, Long branchId) {
        Directory directory = DirectoryBuilder.standard().setProjectId(project.getProjectId())
            .setIdentifiers(name, id, directoryId, branchId).build();
        directories.add(directory);
        return this;
    }

    public ProjectBuilder addFile(String name, String type, Long id, Long directoryId, Long branchId) {
        File file = FileBuilder.standard().setProjectId(project.getProjectId())
            .setIdentifiers(name, type, id, directoryId, branchId).build();
        files.add(file);
        return this;
    }

    public ProjectBuilder addFile(String name, String type, Long id, Long directoryId, Long branchId, String exportPattern) {
        File file = FileBuilder.standard().setProjectId(project.getProjectId())
                .setIdentifiers(name, type, id, directoryId, branchId).build();
        file.setExportOptions(new GeneralFileExportOptions() {{
                setExportPattern(exportPattern);
            }}
        );
        file.setPath(name);
        files.add(file);
        return this;
    }

    public ProjectBuilder addLanguageMapping(String langLocale, String placeholder, String value) {
        languageMapping.putIfAbsent(langLocale, new HashMap<>());
        languageMapping.get(langLocale).put(placeholder, value);

        projectSettings.setLanguageMapping(languageMapping);
        return this;
    }

    public CrowdinProjectFull build() {
        project.setDirectories(directories);
        project.setFiles(files);
        project.setLanguageMapping(LanguageMapping.fromServerLanguageMapping(projectSettings.getLanguageMapping()));
        return project;
    }

    private static ProjectSettings buildProjectSettings(Long projectId) {
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX");
        ProjectSettings ps = new ProjectSettings();
        ps.setId(projectId);
        ps.setUserId(14047999L);
        ps.setSourceLanguageId("en");
        List<String> targetLanguageIds = new ArrayList<>();
        targetLanguageIds.add(LanguageBuilder.RUS.build().getId());
        targetLanguageIds.add(LanguageBuilder.UKR.build().getId());
        targetLanguageIds.add(LanguageBuilder.DEU.build().getId());
        targetLanguageIds.add(LanguageBuilder.ENG.build().getId());
        ps.setTargetLanguageIds(targetLanguageIds);
        ps.setName("checkdest");
        ps.setIdentifier("checkdest");
        ps.setPublicDownloads(false);
        try {
            ps.setCreatedAt(dateFormat.parse("2019-12-30T18:13:12+00:00"));
            ps.setUpdatedAt(dateFormat.parse("2020-03-02T14:14:04+00:00"));
        } catch (ParseException e) {
            throw new RuntimeException(e);
        }
        ps.setTranslateDuplicates(3);
        ps.setIsMtAllowed(true);
        ps.setAutoSubstitution(true);
        ps.setUseGlobalTm(false);
        ps.setInContext(true);
        ps.setInContextPseudoLanguageId("ach");
        ps.setIsSuspended(false);
        ps.setQaCheckIsActive(false);
        return ps;
    }
}
