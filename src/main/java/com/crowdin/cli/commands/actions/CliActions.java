package com.crowdin.cli.commands.actions;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.ClientGlossary;
import com.crowdin.cli.client.ClientTm;
import com.crowdin.cli.client.NoClient;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.cli.properties.NoProperties;
import com.crowdin.cli.properties.PropertiesWithTargets;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.client.glossaries.model.GlossariesFormat;
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
        FilesInterface files, boolean noProgress, String languageId, boolean pseudo, String branchName,
        boolean ignoreMatch, boolean isVerbose, boolean plainView, boolean useServerSources
    ) {
        return new DownloadAction(files, noProgress, languageId, pseudo, branchName, ignoreMatch, isVerbose, plainView, useServerSources);
    }

    @Override
    public NewAction<NoProperties, NoClient> generate(FilesInterface files, Path destinationPath, boolean skipGenerateDescription) {
        return new GenerateAction(files, destinationPath, skipGenerateDescription);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> listBranches(boolean noProgress, boolean plainView) {
        return new ListBranchesAction(noProgress, plainView);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> listProject(
        boolean noProgress, String branchName, boolean treeView, boolean plainView
    ) {
        return new ListProjectAction(noProgress, branchName, treeView, plainView);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> listSources(
        boolean noProgress, boolean treeView, boolean plainView
    ) {
        return new ListSourcesAction(noProgress, treeView, plainView);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> listTranslations(
        boolean noProgress, boolean treeView, boolean isLocal, boolean plainView, boolean useServerSources, boolean withInContextLang
    ) {
        return new ListTranslationsAction(noProgress, treeView, isLocal, plainView, useServerSources, withInContextLang);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> listLanguages(BaseCli.LanguageCode code, boolean noProgress, boolean plainView) {
        return new ListLanguagesAction(code, noProgress, plainView);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> status(
        boolean noProgress, String branchName, String languageId, boolean isVerbose, boolean showTranslated, boolean showApproved
    ) {
        return new StatusAction(noProgress, branchName, languageId, isVerbose, showTranslated, showApproved);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> stringAdd(
        boolean noProgress, String text, String identifier, Integer maxLength, String context, List<String> files, Boolean hidden
    ) {
        return new StringAddAction(noProgress, text, identifier, maxLength, context, files, hidden);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> stringDelete(
        boolean noProgress, List<Long> ids, List<String> texts, List<String> identifiers
    ) {
        return new StringDeleteAction(noProgress, ids, texts, identifiers);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> stringEdit(
        boolean noProgress, Long id, String identifier, String newText, String newContext, Integer newMaxLength, Boolean isHidden
    ) {
        return new StringEditAction(noProgress, id, identifier, newText, newContext, newMaxLength, isHidden);
    }

    @Override
    public NewAction<PropertiesWithFiles, ProjectClient> stringList(
        boolean noProgress, boolean isVerbose, String file, String filter
    ) {
        return new StringListAction(noProgress, isVerbose, file, filter);
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
        java.io.File file, Long id, String name, Map<String, Integer> scheme, Boolean firstLineContainsHeader
    ) {
        return new GlossaryUploadAction(file, id, name, scheme, firstLineContainsHeader);
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
        File file, Long id, String name, Map<String, Integer> scheme, Boolean firstLineContainsHeader
    ) {
        return new TmUploadAction(file, id, name, scheme, firstLineContainsHeader);
    }

    @Override
    public NewAction<BaseProperties, ClientTm> tmDownload(
        Long id, String name, TranslationMemoryFormat format, String sourceLanguageId,
        String targetLanguageId, boolean noProgress, File to, FilesInterface files
    ) {
        return new TmDownloadAction(id, name, format, sourceLanguageId, targetLanguageId, noProgress, to, files);
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
        Boolean translateUntranslatedOnly, Boolean translateWithPerfectMatchOnly, boolean noProgress, boolean debug, boolean verbose, boolean plainView
    ) {
        return new PreTranslateAction(languageIds, method, engineId, branchName, autoApproveOption, duplicateTranslations,
            translateUntranslatedOnly, translateWithPerfectMatchOnly, noProgress, debug, verbose, plainView);
    }

}
