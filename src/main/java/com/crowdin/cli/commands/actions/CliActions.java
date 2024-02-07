package com.crowdin.cli.commands.actions;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.*;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.NoProperties;
import com.crowdin.cli.properties.PropertiesWithTargets;
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

public class CliActions implements Actions {

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> download(
        FilesInterface files, boolean noProgress, List<String> languageIds, List<String> excludeLanguageIds, boolean pseudo, String branchName,
        boolean ignoreMatch, boolean isVerbose, boolean plainView, boolean useServerSources, boolean keepArchive
    ) {
        return new DownloadAction(files, noProgress, languageIds, excludeLanguageIds, pseudo, branchName, ignoreMatch, isVerbose, plainView, useServerSources, keepArchive);
    }

    @Override
    public NewAction<NoProperties, NoClient> generate(FilesInterface files, String token, String baseUrl, String basePath,
        String projectId, String source, String translation, Boolean preserveHierarchy, Path destinationPath, boolean skipGenerateDescription
    ) {
        return new GenerateAction(files, token, baseUrl, basePath, projectId, source, translation, preserveHierarchy, destinationPath, skipGenerateDescription);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> listBranches(boolean noProgress, boolean plainView) {
        return new ListBranchesAction(noProgress, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> listProject(
        boolean noProgress, String branchName, boolean treeView, boolean plainView
    ) {
        return new ListProjectAction(noProgress, branchName, treeView, plainView);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> listSources(
        boolean deleteObsolete, String branchName, boolean noProgress, boolean treeView, boolean plainView
    ) {
        return new ListSourcesAction(deleteObsolete, branchName, noProgress, treeView, plainView);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> listTranslations(
        boolean noProgress, boolean treeView, boolean isLocal, boolean plainView, boolean useServerSources, boolean withInContextLang
    ) {
        return new ListTranslationsAction(noProgress, treeView, isLocal, plainView, useServerSources, withInContextLang);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> listLanguages(BaseCli.LanguageCode code, boolean noProgress, boolean plainView) {
        return new ListLanguagesAction(code, noProgress, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> status(
        boolean noProgress, String branchName, String languageId, String file, String directory, boolean isVerbose, boolean showTranslated, boolean showApproved, boolean failIfIncomplete
    ) {
        return new StatusAction(noProgress, branchName, languageId, file, directory, isVerbose, showTranslated, showApproved, failIfIncomplete);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> stringAdd(
        boolean noProgress, String text, String identifier, Integer maxLength, String context, List<String> files, List<String> labelNames, String branch, Boolean hidden
    ) {
        return new StringAddAction(noProgress, text, identifier, maxLength, context, files, labelNames, branch, hidden);
    }
    @Override
    public NewAction<ProjectProperties, ProjectClient> stringComment(boolean plainView,
            boolean noProgress, String text, String stringId, String language, String type, String issueType) {
        return new StringCommentAction(plainView, noProgress, text, stringId, language, type, issueType);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> stringDelete(
        boolean noProgress, List<Long> ids, List<String> texts, List<String> identifiers
    ) {
        return new StringDeleteAction(noProgress, ids, texts, identifiers);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> stringEdit(
        boolean noProgress, Long id, String identifier, String newText, String newContext, Integer newMaxLength, List<String> labelNames, Boolean isHidden
    ) {
        return new StringEditAction(noProgress, id, identifier, newText, newContext, newMaxLength, labelNames, isHidden);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> stringList(
        boolean noProgress, boolean isVerbose, String file, String filter, String branchName, String croql
    ) {
        return new StringListAction(noProgress, isVerbose, file, filter, branchName, croql);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> uploadSources(
        String branchName, boolean deleteObsolete, boolean noProgress, boolean autoUpdate, boolean debug, boolean plainView
    ) {
        return new UploadSourcesAction(branchName, deleteObsolete, noProgress, autoUpdate, debug, plainView);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> uploadTranslations(
        boolean noProgress, String languageId, String branchName, boolean importEqSuggestions,
        boolean autoApproveImported, boolean translateHidden, boolean debug, boolean plainView
    ) {
        return new UploadTranslationsAction(noProgress, languageId, branchName, importEqSuggestions, autoApproveImported, translateHidden, debug, plainView);
    }

    @Override
    public NewAction<BaseProperties, ClientGlossary> glossaryList(boolean plainView, boolean isVerbose) {
        return new GlossaryListAction(plainView, isVerbose);
    }

    @Override
    public NewAction<BaseProperties, ClientGlossary> glossaryUpload(
        java.io.File file, Long id, String name, String languageId, Map<String, Integer> scheme, Boolean firstLineContainsHeader
    ) {
        return new GlossaryUploadAction(file, id, name, languageId, scheme, firstLineContainsHeader);
    }

    @Override
    public NewAction<BaseProperties, ClientGlossary> glossaryDownload(
        Long id, String name, GlossariesFormat format, boolean noProgress, File to, FilesInterface files
    ) {
        return new GlossaryDownloadAction(id, name, format, noProgress, to, files);
    }

    @Override
    public NewAction<BaseProperties, ClientTm> tmList(boolean plainView) {
        return new TmListAction(plainView);
    }

    @Override
    public NewAction<BaseProperties, ClientTm> tmUpload(
        File file, Long id, String name, String languageId, Map<String, Integer> scheme, Boolean firstLineContainsHeader
    ) {
        return new TmUploadAction(file, id, name, languageId, scheme, firstLineContainsHeader);
    }

    @Override
    public NewAction<BaseProperties, ClientTm> tmDownload(
        Long id, String name, TranslationMemoryFormat format, String sourceLanguageId,
        String targetLanguageId, boolean noProgress, File to, FilesInterface files
    ) {
        return new TmDownloadAction(id, name, format, sourceLanguageId, targetLanguageId, noProgress, to, files);
    }

    @Override
    public NewAction<ProjectProperties, ClientTask> taskList(boolean plainView, boolean isVerbose, String status, Long assigneeId) {
        return new TaskListAction(plainView, isVerbose, status, assigneeId);
    }

    @Override
    public NewAction<ProjectProperties, ClientTask> taskAdd(boolean noProgress, String title, Integer type, String language,
        List<String> files, String branch, Long workflowStep, String description, boolean skipAssignedStrings,
        boolean skipUntranslatedStrings, boolean includePreTranslatedStringsOnly, List<Long> labels, ProjectClient projectClient
    ) {
        return new TaskAddAction(noProgress, title, type, language, files, branch, workflowStep, description, skipAssignedStrings, skipUntranslatedStrings, includePreTranslatedStringsOnly, labels, projectClient);
    }

    @Override
    public NewAction<ProjectProperties, ClientDistribution> distributionList(boolean plainView) {
        return new DistributionListAction(plainView);
    }

    @Override
    public NewAction<ProjectProperties, ClientDistribution> distributionAdd(boolean noProgress, boolean plainView, String name, ExportMode exportMode, List<String> files, List<Integer> bundleIds, String branch, ProjectClient projectClient) {
        return new DistributionAddAction(noProgress, plainView, name, exportMode, files, bundleIds, branch, projectClient);
    }

    @Override
    public NewAction<ProjectProperties, ClientDistribution> distributionRelease(boolean noProgress, boolean plainView, String hash, ProjectClient projectClient) {
        return new DistributionReleaseAction(noProgress, plainView, hash, projectClient);
    }

    @Override
    public NewAction<ProjectProperties, ClientComment> commentList(boolean plainView, boolean isVerbose,String stringId,
                                                                   com.crowdin.client.stringcomments.model.Type type, com.crowdin.client.issues.model.Type issueType,
                                                                   IssueStatus status) {
        return new CommentListAction(plainView, isVerbose, stringId, type, issueType, status);
    }

    @Override
    public NewAction<ProjectProperties, ClientComment> resolve(Long id) {
        return new CommentResolveAction(id);
    }

    @Override
    public NewAction<ProjectProperties, ClientBundle> bundleList(boolean plainView, boolean isVerbose) {
        return new BundleListAction(plainView);
    }

    @Override
    public NewAction<ProjectProperties, ClientBundle> bundleAdd(String name, String format, List<String> source, List<String> ignore, String translation, List<Long> labels, boolean plainView) {
        return new BundleAddAction(name, format, source, ignore, translation, labels, plainView);
    }

    @Override
    public NewAction<NoProperties, NoClient> checkNewVersion() {
        return new CheckNewVersionAction();
    }

    @Override
    public NewAction<PropertiesWithTargets, ProjectClient> downloadTargets(
        List<String> targetNames, FilesInterface files, boolean noProgress,
        List<String> langIds, boolean isVerbose, boolean plainView, boolean debug, String branchName
    ) {
        return new DownloadTargetsAction(targetNames, files, noProgress, langIds, isVerbose, plainView, debug, branchName);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> preTranslate(
        List<String> languageIds, Method method, Long engineId, String branchName, AutoApproveOption autoApproveOption, Boolean duplicateTranslations,
        Boolean translateUntranslatedOnly, Boolean translateWithPerfectMatchOnly, boolean noProgress, boolean debug, boolean verbose, boolean plainView, List<String> labelNames
    ) {
        return new PreTranslateAction(languageIds, method, engineId, branchName, autoApproveOption, duplicateTranslations,
            translateUntranslatedOnly, translateWithPerfectMatchOnly, noProgress, debug, verbose, plainView, labelNames);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> branchAdd(String name, String title, String exportPattern, Priority priority) {
        return new BranchAddAction(name, title, exportPattern, priority);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> branchDelete(String name) {
        return new BranchDeleteAction(name);
    }

    @Override
    public NewAction<ProjectProperties, ClientScreenshot> screenshotList(Long stringId, boolean plainView) {
        return new ScreenshotListAction(stringId, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ClientScreenshot> screenshotUpload(File file, String branchName, List<String> labelNames, String directoryPath, String filePath, boolean autoTag, boolean plainView, boolean noProgress, ProjectClient projectClient) {
        return new ScreenshotUploadAction(file, branchName, labelNames, filePath, directoryPath, autoTag, plainView, noProgress, projectClient);
    }

    @Override
    public NewAction<ProjectProperties, ClientScreenshot> screenshotDelete(String name) {
        return new ScreenshotDeleteAction(name);
    }

    @Override
    public NewAction<ProjectProperties, ClientLabel> labelList(boolean plainView, boolean isVerbose) {
        return new LabelListAction(plainView, isVerbose);
    }

    @Override
    public NewAction<ProjectProperties, ClientLabel> labelAdd(String title, boolean plainView) {
        return new LabelAddAction(title, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ClientLabel> labelDelete(String title) {
        return new LabelDeleteAction(title);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> fileUpload(File file, String branch, boolean autoUpdate, List<String> labels, String destination, List<String> excludedLanguages, boolean plainView, boolean cleanupMode, boolean updateStrings) {
        return new FileUploadAction(file, branch, autoUpdate, labels, destination, cleanupMode, updateStrings, excludedLanguages, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> fileUploadTranslation(File file, String branch, String dest, String languageId, boolean plainView) {
        return new FileUploadTranslationAction(file, branch, dest, languageId, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> fileDownload(String file, String branch, String destParam) {
        return new FileDownloadAction(file, branch, destParam);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> fileDownloadTranslation(String file, String languageId, String branch, String destParam) {
        return new FileDownloadTranslationAction(file, languageId, branch, destParam);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> fileDelete(String file, String branch) {
        return new FileDeleteAction(file, branch);
    }
}
