package com.crowdin.cli.commands.actions;

import com.crowdin.cli.commands.Action;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.Step;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.client.glossaries.model.GlossariesFormat;
import com.crowdin.client.translationmemory.model.TranslationMemoryFormat;

import java.io.File;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

public class CliActions implements Actions {

    @Override
    public ClientAction download(
        FilesInterface files, boolean noProgress, String languageId, String branchName,
        boolean ignoreMatch, boolean isVerbose, Boolean skipTranslatedOnly,
        Boolean skipUntranslatedFiles, Boolean exportApprovedOnly, boolean plainView
    ) {
        return new DownloadAction(files, noProgress, languageId, branchName, ignoreMatch, isVerbose,
            skipTranslatedOnly, skipUntranslatedFiles, exportApprovedOnly, plainView);
    }

    @Override
    public Action generate(FilesInterface files, Path destinationPath, boolean skipGenerateDescription) {
        return new GenerateAction(files, destinationPath, skipGenerateDescription);
    }

    @Override
    public ClientAction listBranches(boolean noProgress,  boolean plainView) {
        return new ListBranchesAction(noProgress, plainView);
    }

    @Override
    public ClientAction listProject(boolean noProgress, String branchName, boolean treeView, boolean plainView) {
        return new ListProjectAction(noProgress, branchName, treeView, plainView);
    }

    @Override
    public ClientAction listSources(boolean noProgress, boolean treeView, boolean plainView) {
        return new ListSourcesAction(noProgress, treeView, plainView);
    }

    @Override
    public ClientAction listTranslations(boolean noProgress, boolean treeView, boolean isLocal, boolean plainView) {
        return new ListTranslationsAction(noProgress, treeView, isLocal, plainView);
    }

    @Override
    public ClientAction status(boolean noProgress, String languageId, boolean isVerbose, boolean showTranslated, boolean showApproved) {
        return new StatusAction(noProgress, languageId, isVerbose, showTranslated, showApproved);
    }

    @Override
    public ClientAction stringAdd(
        boolean noProgress, String text, String identifier, Integer maxLength, String context, List<String> files, Boolean hidden
    ) {
        return new StringAddAction(noProgress, text, identifier, maxLength, context, files, hidden);
    }

    @Override
    public ClientAction stringDelete(boolean noProgress, List<Long> ids, List<String> texts, List<String> identifiers) {
        return new StringDeleteAction(noProgress, ids, texts, identifiers);
    }

    @Override
    public ClientAction stringEdit(
        boolean noProgress, Long id, String identifier, String newText, String newContext, Integer newMaxLength, Boolean isHidden
    ) {
        return new StringEditAction(noProgress, id, identifier, newText, newContext, newMaxLength, isHidden);
    }

    @Override
    public ClientAction stringList(boolean noProgress, boolean isVerbose, String file, String filter) {
        return new StringListAction(noProgress, isVerbose, file, filter);
    }

    @Override
    public ClientAction uploadSources(String branchName, boolean noProgress, boolean autoUpdate, boolean debug, boolean plainView) {
        return new UploadSourcesAction(branchName, noProgress, autoUpdate, debug, plainView);
    }

    @Override
    public ClientAction uploadTranslations(
        boolean noProgress, String languageId, String branchName, boolean importEqSuggestions,
        boolean autoApproveImported, boolean debug, boolean plainView
    ) {
        return new UploadTranslationsAction(noProgress, languageId, branchName, importEqSuggestions, autoApproveImported, debug, plainView);
    }

    @Override
    public ClientAction glossaryList(boolean plainView, boolean isVerbose) {
        return new GlossaryListAction(plainView, isVerbose);
    }

    @Override
    public ClientAction glossaryUpload(java.io.File file, Long id, String name, Map<String, Integer> scheme) {
        return new GlossaryUploadAction(file, id, name, scheme);
    }

    @Override
    public ClientAction glossaryDownload(Long id, String name, GlossariesFormat format, boolean noProgress, File to, FilesInterface files) {
        return new GlossaryDownloadAction(id, name, format, noProgress, to, files);
    }

    @Override
    public ClientAction tmList(boolean plainView) {
        return new TmListAction(plainView);
    }

    @Override
    public ClientAction tmUpload(File file, Long id, String name, Map<String, Integer> scheme) {
        return new TmUploadAction(file, id, name, scheme);
    }

    @Override
    public ClientAction tmDownload(
        Long id, String name, TranslationMemoryFormat format, String sourceLanguageId,
        String targetLanguageId, boolean noProgress, File to, FilesInterface files
    ) {
        return new TmDownloadAction(id, name, format, sourceLanguageId, targetLanguageId, noProgress, to, files);
    }

    @Override
    public Action checkNewVersion() {
        return new CheckNewVersionAction();
    }

    @Override
    public Step<PropertiesBean> buildProperties(File configFile, File identityFile, Params params) {
        return new BuildPropertiesStep(configFile, identityFile, params);
    }


}
