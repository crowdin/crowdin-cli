package com.crowdin.cli.commands.actions;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.*;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
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
import java.time.LocalDate;
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
    public NewAction<NoProperties, NoClient> init(FilesInterface files, String token, String baseUrl, String basePath,
        String projectId, String source, String translation, Boolean preserveHierarchy, Path destinationPath, boolean quiet
    ) {
        return new InitAction(files, token, baseUrl, basePath, projectId, source, translation, preserveHierarchy, destinationPath, quiet);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> listBranches(boolean noProgress, boolean plainView) {
        return new BranchListAction(noProgress, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> listFiles(
        boolean noProgress, String branchName, boolean treeView, boolean plainView, boolean isVerbose
    ) {
        return new FileListAction(noProgress, branchName, treeView, plainView, isVerbose);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> listSources(
        boolean deleteObsolete, String branchName, boolean noProgress, boolean treeView, boolean plainView
    ) {
        return new ListSourcesAction(deleteObsolete, branchName, noProgress, treeView, plainView);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> listTranslations(
        boolean noProgress, boolean treeView, boolean isLocal, boolean plainView, boolean useServerSources, boolean withInContextLang, boolean isUpload
    ) {
        return new ListTranslationsAction(noProgress, treeView, isLocal, plainView, useServerSources, withInContextLang, isUpload);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> listLanguages(BaseCli.LanguageCode code, boolean all, boolean noProgress, boolean plainView) {
        return new LanguageListAction(code, all, noProgress, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> status(
        boolean noProgress, String branchName, String languageId, String file, String directory, boolean isVerbose, boolean showTranslated, boolean showApproved, boolean failIfIncomplete, boolean plainView
    ) {
        return new StatusAction(noProgress, branchName, languageId, file, directory, isVerbose, showTranslated, showApproved, failIfIncomplete, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> stringAdd(
        boolean noProgress, String text, String identifier, Integer maxLength, String context, List<String> files, List<String> labelNames, String branch, Boolean hidden,
        String one, String two, String few, String many, String zero, boolean plainView
    ) {
        return new StringAddAction(noProgress, text, identifier, maxLength, context, files, labelNames, branch, hidden, one, two, few, many, zero, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> stringComment(boolean plainView, String text, String stringId, String language, String type, String issueType) {
        return new CommentAddAction(plainView, text, stringId, language, type, issueType);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> stringDelete(Long id) {
        return new StringDeleteAction(id);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> stringEdit(
            boolean noProgress, boolean isVerbose, Long id, String identifier, String newText, String newContext,
            Integer newMaxLength, List<String> labelNames, Boolean isHidden, boolean plainView
    ) {
        return new StringEditAction(noProgress, isVerbose, id, identifier, newText, newContext, newMaxLength, labelNames, isHidden, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> stringList(
        boolean noProgress, boolean isVerbose, String file, String filter, String branchName, List<String> labelNames, String croql, String directory, String scope, boolean plainView
    ) {
        return new StringListAction(noProgress, isVerbose, file, filter, branchName, labelNames, croql, directory, scope, plainView);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> uploadSources(
        String branchName, boolean deleteObsolete, boolean noProgress, boolean autoUpdate, boolean debug, boolean plainView, boolean isVerbose, boolean cache
    ) {
        return new UploadSourcesAction(branchName, deleteObsolete, noProgress, autoUpdate, debug, plainView, isVerbose, cache);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> uploadTranslations(
        boolean noProgress, String languageId, String branchName, boolean importEqSuggestions,
        boolean autoApproveImported, boolean translateHidden, boolean debug, boolean plainView, boolean isVerbose
    ) {
        return new UploadTranslationsAction(noProgress, languageId, branchName, importEqSuggestions, autoApproveImported, translateHidden, debug, plainView, isVerbose);
    }

    @Override
    public NewAction<BaseProperties, ClientGlossary> glossaryList(boolean plainView, boolean isVerbose) {
        return new GlossaryListAction(plainView, isVerbose);
    }

    @Override
    public NewAction<BaseProperties, ClientGlossary> glossaryUpload(
        java.io.File file, Long id, String languageId, Map<String, Integer> scheme, Boolean firstLineContainsHeader, boolean plainView
    ) {
        return new GlossaryUploadAction(file, id, languageId, scheme, firstLineContainsHeader, plainView);
    }

    @Override
    public NewAction<BaseProperties, ClientGlossary> glossaryDownload(
        Long id, GlossariesFormat format, boolean noProgress, File to, FilesInterface files
    ) {
        return new GlossaryDownloadAction(id, format, noProgress, to, files);
    }

    @Override
    public NewAction<BaseProperties, ClientTm> tmList(boolean plainView) {
        return new TmListAction(plainView);
    }

    @Override
    public NewAction<BaseProperties, ClientTm> tmUpload(
        File file, Long id, String languageId, Map<String, Integer> scheme, Boolean firstLineContainsHeader, boolean plainView
    ) {
        return new TmUploadAction(file, id, languageId, scheme, firstLineContainsHeader, plainView);
    }

    @Override
    public NewAction<BaseProperties, ClientTm> tmDownload(
        Long id, TranslationMemoryFormat format, String sourceLanguageId,
        String targetLanguageId, boolean noProgress, File to, FilesInterface files
    ) {
        return new TmDownloadAction(id, format, sourceLanguageId, targetLanguageId, noProgress, to, files);
    }

    @Override
    public NewAction<ProjectProperties, ClientTask> taskList(boolean plainView, boolean isVerbose, String status, Long assigneeId) {
        return new TaskListAction(plainView, isVerbose, status, assigneeId);
    }

    @Override
    public NewAction<ProjectProperties, ClientTask> taskAdd(boolean noProgress, String title, Integer type, String language,
        List<String> files, String branch, Long workflowStep, String description, Boolean skipAssignedStrings,
        Boolean includePreTranslatedStringsOnly, List<Long> labels, boolean plainView
    ) {
        return new TaskAddAction(noProgress, title, type, language, files, branch, workflowStep, description, skipAssignedStrings, includePreTranslatedStringsOnly, labels, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ClientDistribution> distributionList(boolean plainView) {
        return new DistributionListAction(plainView);
    }

    @Override
    public NewAction<ProjectProperties, ClientDistribution> distributionAdd(boolean noProgress, boolean plainView, String name, ExportMode exportMode, List<String> files, List<Integer> bundleIds, String branch) {
        return new DistributionAddAction(noProgress, plainView, name, exportMode, files, bundleIds, branch);
    }

    @Override
    public NewAction<ProjectProperties, ClientDistribution> distributionEdit(String hash, boolean noProgress, boolean plainView, String name, ExportMode exportMode, List<String> files, List<Integer> bundleIds, String branch) {
        return new DistributionEditAction(hash, noProgress, plainView, name, exportMode, files, bundleIds, branch);
    }

    @Override
    public NewAction<ProjectProperties, ClientDistribution> distributionRelease(boolean noProgress, boolean plainView, String hash) {
        return new DistributionReleaseAction(noProgress, plainView, hash);
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
    public NewAction<ProjectProperties, ClientBundle> bundleAdd(String name, String format, List<String> source, List<String> ignore, String translation, List<Long> labels, boolean plainView, boolean includeProjectSourceLanguage, boolean includePseudoLanguage, boolean isMultilingual) {
        return new BundleAddAction(name, format, source, ignore, translation, labels, plainView, includeProjectSourceLanguage, includePseudoLanguage, isMultilingual);
    }

    @Override
    public NewAction<ProjectProperties, ClientBundle> bundleDelete(Long id) {
        return new BundleDeleteAction(id);
    }

    @Override
    public NewAction<ProjectProperties, ClientBundle> bundleBrowse(Long id) {
        return new BundleBrowseAction(id);
    }

    @Override
    public NewAction<ProjectProperties, ClientBundle> bundleClone(Long id, String name, String format, List<String> source, List<String> ignore, String translation, List<Long> labels, boolean plainView, Boolean includeProjectSourceLanguage, Boolean includePseudoLanguage, Boolean isMultilingual) {
        return new BundleCloneAction(id, name, format, source, ignore, translation, labels, plainView, includeProjectSourceLanguage, includePseudoLanguage, isMultilingual);
    }

    @Override
    public NewAction<NoProperties, NoClient> checkNewVersion() {
        return new CheckNewVersionAction();
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> preTranslate(
        List<String> languageIds, List<String> excludeLanguageIds, List<String> files, Method method, Long engineId, String branchName, String directory,
        AutoApproveOption autoApproveOption, Boolean duplicateTranslations, Boolean translateUntranslatedOnly, Boolean translateWithPerfectMatchOnly, boolean noProgress,
        boolean plainView, List<String> labelNames, Long aiPrompt, boolean isVerbose
    ) {
        return new PreTranslateAction(languageIds, excludeLanguageIds, files, method, engineId, branchName, directory, autoApproveOption, duplicateTranslations,
            translateUntranslatedOnly, translateWithPerfectMatchOnly, noProgress, plainView, labelNames, aiPrompt, isVerbose);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> branchAdd(String name, String title, String exportPattern, Priority priority, boolean plainView) {
        return new BranchAddAction(name, title, exportPattern, priority, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> branchClone(String source, String target, boolean noProgress, boolean plainView) {
        return new BranchCloneAction(source, target, noProgress, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> branchMerge(String source, String target, boolean dryrun, boolean deleteAfterMerge, boolean noProgress, boolean plainView) {
        return new BranchMergeAction(source, target, noProgress, plainView, dryrun, deleteAfterMerge);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> branchDelete(String name) {
        return new BranchDeleteAction(name);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> branchEdit(String branch, String name, String title, Priority priority, boolean noProgress, boolean plainView) {
        return new BranchEditAction(branch, name, title, priority, noProgress, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ClientScreenshot> screenshotList(Long stringId, boolean plainView) {
        return new ScreenshotListAction(stringId, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ClientScreenshot> screenshotUpload(File file, String branchName, List<String> labelNames, String directoryPath, String filePath, boolean autoTag, boolean plainView, boolean noProgress) {
        return new ScreenshotUploadAction(file, branchName, labelNames, filePath, directoryPath, autoTag, plainView, noProgress);
    }

    @Override
    public NewAction<ProjectProperties, ClientScreenshot> screenshotDelete(Long id) {
        return new ScreenshotDeleteAction(id);
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
    public NewAction<ProjectProperties, ProjectClient> fileUpload(File file, String branch, boolean autoUpdate, List<String> labels, String destination, String context, String type, Integer parserVersion, List<String> excludedLanguages, boolean plainView, boolean cleanupMode, boolean updateStrings) {
        return new FileUploadAction(file, branch, autoUpdate, labels, destination, context, type, parserVersion, cleanupMode, updateStrings, excludedLanguages, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> fileUploadTranslation(File file, String branch, String dest, String languageId, boolean xliff, boolean plainView, boolean isVerbose) {
        return new FileUploadTranslationAction(file, branch, dest, languageId, xliff, plainView, isVerbose);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> fileDownload(String file, String branch, boolean noProgress, String destParam) {
        return new FileDownloadAction(file, branch, noProgress, destParam);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> fileDownloadTranslation(String file, String languageId, String branch, boolean noProgress, String destParam) {
        return new FileDownloadTranslationAction(file, languageId, branch, noProgress, destParam);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> fileDelete(String file, String branch) {
        return new FileDeleteAction(file, branch);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> projectBrowse() {
        return new ProjectBrowseAction();
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> projectList(boolean isVerbose) {
        return new ProjectListAction(isVerbose);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> projectAdd(String name, boolean isStringBased, String sourceLanguage, List<String> languages, boolean isPublic, boolean plainView) {
        return new ProjectAddAction(name, isStringBased, sourceLanguage, languages, isPublic, plainView);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> listApps(boolean plainView) {
        return new AppListAction(plainView);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> uninstallApp(String id, Boolean force) {
        return new AppUninstallAction(id, force);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> installApp(String identifier) {
        return new AppInstallAction(identifier);
    }

    @Override
    public NewAction<ProjectProperties, ProjectClient> contextDownload(File to, List<String> filesFilter, List<String> labelsFilter, String branchFilter, String croqlFilter, LocalDate sinceFilter, String statusFilter, String outputFormat, FilesInterface files, boolean plainView, boolean noProgress) {
        return new ContextDownloadAction(to, filesFilter, labelsFilter, branchFilter, croqlFilter, sinceFilter, statusFilter, outputFormat, files, plainView, noProgress);
    }
}
