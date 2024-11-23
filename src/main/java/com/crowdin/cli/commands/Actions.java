package com.crowdin.cli.commands;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.*;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.NoProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.client.core.model.Priority;
import com.crowdin.client.distributions.model.ExportMode;
import com.crowdin.client.glossaries.model.GlossariesFormat;
import com.crowdin.client.stringcomments.model.IssueStatus;
import com.crowdin.client.translationmemory.model.TranslationMemoryFormat;
import com.crowdin.client.translations.model.AutoApproveOption;
import com.crowdin.client.translations.model.Method;

import java.io.File;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

public interface Actions {

    NewAction<PropertiesWithFiles, ProjectClient> download(
        FilesInterface files, boolean noProgress, List<String> languageIds, List<String> excludeLanguageIds, boolean pseudo, String branchName,
        boolean ignoreMatch, boolean isVerbose, boolean plainView, boolean userServerSources, boolean keepArchive
    );

    NewAction<NoProperties, NoClient> init(FilesInterface files, String token, String baseUrl, String basePath,
        String projectId, String source, String translation, Boolean preserveHierarchy, Path destinationPath, boolean quiet);

    NewAction<ProjectProperties, ProjectClient> listBranches(boolean noProgress, boolean plainView);

    NewAction<ProjectProperties, ProjectClient> listFiles(
        boolean noProgress, String branchName, boolean treeView, boolean plainView, boolean isVerbose);

    NewAction<PropertiesWithFiles, ProjectClient> listSources(
        boolean deleteObsolete, String branchName, boolean noProgress, boolean treeView, boolean plainView);

    NewAction<PropertiesWithFiles, ProjectClient> listTranslations(
        boolean noProgress, boolean treeView, boolean isLocal, boolean plainView, boolean useServerSources, boolean withInContextLang, boolean isUpload);

    NewAction<ProjectProperties, ProjectClient> listLanguages(BaseCli.LanguageCode code, boolean all, boolean noProgress, boolean plainView);

    NewAction<ProjectProperties, ProjectClient> status(
        boolean noProgress, String branchName, String languageId, String file, String directory, boolean isVerbose, boolean showTranslated, boolean showApproved, boolean failIfIncomplete, boolean plainView);

    NewAction<ProjectProperties, ProjectClient> stringAdd(
        boolean noProgress, String text, String identifier, Integer maxLength, String context, List<String> files, List<String> labelNames, String branch, Boolean hidden,
        String one, String two, String few, String many, String zero, boolean plainView);

    NewAction<ProjectProperties, ProjectClient> stringComment(boolean plainView, String text, String stringId, String language, String type, String issueType);

    NewAction<ProjectProperties, ProjectClient> stringDelete(Long id);

    NewAction<ProjectProperties, ProjectClient> stringEdit(
            boolean noProgress, boolean isVerbose, Long id, String identifier, String newText, String newContext,
            Integer newMaxLength, List<String> labelNames, Boolean isHidden, boolean plainView);

    NewAction<ProjectProperties, ProjectClient> stringList(
        boolean noProgress, boolean isVerbose, String file, String filter, String branchName, List<String> labelNames, String croql, String directory, String scope, boolean plainView);

    NewAction<PropertiesWithFiles, ProjectClient> uploadSources(
        String branchName, boolean deleteObsolete, boolean noProgress, boolean autoUpdate, boolean debug, boolean plainView);

    NewAction<PropertiesWithFiles, ProjectClient> uploadTranslations(
        boolean noProgress, String languageId, String branchName, boolean importEqSuggestions,
        boolean autoApproveImported, boolean translateHidden, boolean debug, boolean plainView);

    NewAction<BaseProperties, ClientGlossary> glossaryList(boolean plainView, boolean isVerbose);

    NewAction<BaseProperties, ClientGlossary> glossaryUpload(
        java.io.File file, Long id, String languageId, Map<String, Integer> scheme, Boolean firstLineContainsHeader, boolean plainView);

    NewAction<BaseProperties, ClientGlossary> glossaryDownload(
        Long id, GlossariesFormat format, boolean noProgress, File to, FilesInterface files);

    NewAction<BaseProperties, ClientTm> tmList(boolean plainView);

    NewAction<BaseProperties, ClientTm> tmUpload(
        File file, Long id, String languageId, Map<String, Integer> scheme, Boolean firstLineContainsHeader, boolean plainView);

    NewAction<BaseProperties, ClientTm> tmDownload(
        Long id, TranslationMemoryFormat format, String sourceLanguageId,
        String targetLanguageId, boolean noProgress, File to, FilesInterface files);

    NewAction<ProjectProperties, ClientTask> taskList(boolean plainView, boolean isVerbose, String status, Long assigneeId);

    NewAction<ProjectProperties, ClientTask> taskAdd(
        boolean noProgress, String title, Integer type, String language, List<String> files, String branch, Long workflowStep,
        String description, boolean skipAssignedStrings, boolean skipUntranslatedStrings, boolean includePreTranslatedStringsOnly,
        List<Long> labels, ProjectClient projectClient, boolean plainView);

    NewAction<ProjectProperties, ClientDistribution> distributionList(boolean plainView);

    NewAction<ProjectProperties, ClientDistribution> distributionAdd(boolean noProgress, boolean plainView, String name, ExportMode exportMode, List<String> files, List<Integer> bundleIds, String branch, ProjectClient projectClient);

    NewAction<ProjectProperties, ClientDistribution> distributionRelease(boolean noProgress, boolean plainView, String hash, ProjectClient projectClient);

    NewAction<ProjectProperties, ClientComment> commentList(boolean plainView, boolean isVerbose, String stringId, com.crowdin.client.stringcomments.model.Type type, com.crowdin.client.issues.model.Type issueType, IssueStatus status);

    NewAction<ProjectProperties, ClientComment> resolve(Long id);

    NewAction<ProjectProperties, ClientBundle> bundleList(boolean plainView, boolean isVerbose);

    NewAction<ProjectProperties, ClientBundle> bundleAdd(String name, String format, List<String> source, List<String> ignore, String translation, List<Long> labels, boolean plainView, boolean includeProjectSourceLanguage, boolean isMultilingual);

    NewAction<ProjectProperties, ClientBundle> bundleBrowse(Long id);

    NewAction<NoProperties, NoClient> checkNewVersion();

    NewAction<PropertiesWithFiles, ProjectClient> preTranslate(
        List<String> languageIds, List<String> files, Method method, Long engineId, String branchName, String directory, AutoApproveOption autoApproveOption, Boolean duplicateTranslations,
        Boolean translateUntranslatedOnly, Boolean translateWithPerfectMatchOnly, boolean noProgress, boolean plainView, List<String> labelNames, Long aiPrompt);

    NewAction<ProjectProperties, ProjectClient> branchAdd(String name, String title, String exportPattern, Priority priority, boolean plainView);

    NewAction<ProjectProperties, ProjectClient> branchClone(String source, String target, boolean noProgress, boolean plainView);

    NewAction<ProjectProperties, ProjectClient> branchMerge(String source, String target, boolean dryrun, boolean deleteAfterMerge, boolean noProgress, boolean plainView);

    NewAction<ProjectProperties, ProjectClient> branchDelete(String name);

    NewAction<ProjectProperties, ProjectClient> branchEdit(String branch, String name, String title, Priority priority, boolean noProgress, boolean plainView);

    NewAction<ProjectProperties, ClientScreenshot> screenshotList(Long stringId, boolean plainView);

    NewAction<ProjectProperties, ClientScreenshot> screenshotUpload(File file, String branchName, List<String> labelNames, String directoryPath, String filePath, boolean autoTag, boolean plainView, boolean noProgress, ProjectClient projectClient);

    NewAction<ProjectProperties, ClientScreenshot> screenshotDelete(Long id);

    NewAction<ProjectProperties, ClientLabel> labelList(boolean plainView, boolean isVerbose);

    NewAction<ProjectProperties, ClientLabel> labelAdd(String title, boolean plainView);

    NewAction<ProjectProperties, ClientLabel> labelDelete(String title);

    NewAction<ProjectProperties, ProjectClient> fileUpload(File file, String branch, boolean autoUpdate, List<String> labels, String destination, String context, String type, Integer parserVersion, List<String> excludedLanguages,  boolean plainView, boolean cleanupMode, boolean updateString);

    NewAction<ProjectProperties, ProjectClient> fileUploadTranslation(File file, String branch, String dest, String languageId, boolean plainView);

    NewAction<ProjectProperties, ProjectClient> fileDownload(String file, String branch, String destParam);

    NewAction<ProjectProperties, ProjectClient> fileDownloadTranslation(String file, String languageId, String branch, String destParam);

    NewAction<ProjectProperties, ProjectClient> fileDelete(String file, String branch);

    NewAction<ProjectProperties, ProjectClient> projectBrowse();

    NewAction<ProjectProperties, ProjectClient> projectList(boolean isVerbose);

    NewAction<ProjectProperties, ProjectClient> projectAdd(String name, boolean isStringBased, String sourceLanguage, List<String> languages, boolean isPublic, boolean plainView);

    NewAction<ProjectProperties, ProjectClient> listApps(boolean plainView);

    NewAction<ProjectProperties, ProjectClient> uninstallApp(String id, Boolean force);

    NewAction<ProjectProperties, ProjectClient> installApp(String identifier);
}
