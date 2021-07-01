package com.crowdin.cli.commands;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.ClientGlossary;
import com.crowdin.cli.client.ClientTm;
import com.crowdin.cli.client.NoClient;
import com.crowdin.cli.client.ProjectClient;
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

public interface Actions {

    NewAction<PropertiesWithFiles, ProjectClient> download(
        FilesInterface files, boolean noProgress, String languageId, boolean pseudo, String branchName,
        boolean ignoreMatch, boolean isVerbose, boolean plainView, boolean userServerSources
    );

    NewAction<NoProperties, NoClient> generate(FilesInterface files, Path destinationPath, boolean skipGenerateDescription);

    NewAction<PropertiesWithFiles, ProjectClient> listBranches(boolean noProgress, boolean plainView);

    NewAction<PropertiesWithFiles, ProjectClient> listProject(
        boolean noProgress, String branchName, boolean treeView, boolean plainView);

    NewAction<PropertiesWithFiles, ProjectClient> listSources(
        boolean noProgress, boolean treeView, boolean plainView);

    NewAction<PropertiesWithFiles, ProjectClient> listTranslations(
        boolean noProgress, boolean treeView, boolean isLocal, boolean plainView, boolean useServerSources, boolean withInContextLang);

    NewAction<PropertiesWithFiles, ProjectClient> listLanguages(BaseCli.LanguageCode code, boolean noProgress, boolean plainView);

    NewAction<PropertiesWithFiles, ProjectClient> status(
        boolean noProgress, String branchName, String languageId, boolean isVerbose, boolean showTranslated, boolean showApproved);

    NewAction<PropertiesWithFiles, ProjectClient> stringAdd(
        boolean noProgress, String text, String identifier, Integer maxLength, String context, List<String> files, Boolean hidden);

    NewAction<PropertiesWithFiles, ProjectClient> stringDelete(
        boolean noProgress, List<Long> ids, List<String> texts, List<String> identifiers);

    NewAction<PropertiesWithFiles, ProjectClient> stringEdit(
        boolean noProgress, Long id, String identifier, String newText, String newContext, Integer newMaxLength, Boolean isHidden);

    NewAction<PropertiesWithFiles, ProjectClient> stringList(
        boolean noProgress, boolean isVerbose, String file, String filter);

    NewAction<PropertiesWithFiles, ProjectClient> uploadSources(
        String branchName, boolean deleteObsolete, boolean noProgress, boolean autoUpdate, boolean debug, boolean plainView);

    NewAction<PropertiesWithFiles, ProjectClient> uploadTranslations(
        boolean noProgress, String languageId, String branchName, boolean importEqSuggestions,
        boolean autoApproveImported, boolean translateHidden, boolean debug, boolean plainView);

    NewAction<BaseProperties, ClientGlossary> glossaryList(boolean plainView, boolean isVerbose);

    NewAction<BaseProperties, ClientGlossary> glossaryUpload(
        java.io.File file, Long id, String name, Map<String, Integer> scheme, Boolean firstLineContainsHeader);

    NewAction<BaseProperties, ClientGlossary> glossaryDownload(
        Long id, String name, GlossariesFormat format, boolean noProgress, File to, FilesInterface files);

    NewAction<BaseProperties, ClientTm> tmList(boolean plainView);

    NewAction<BaseProperties, ClientTm> tmUpload(
        File file, Long id, String name, Map<String, Integer> scheme, Boolean firstLineContainsHeader);

    NewAction<BaseProperties, ClientTm> tmDownload(
        Long id, String name, TranslationMemoryFormat format, String sourceLanguageId,
        String targetLanguageId, boolean noProgress, File to, FilesInterface files);

    NewAction<PropertiesWithTargets, ProjectClient> downloadTargets(
        List<String> targetNames, FilesInterface files, boolean noProgress,
        List<String> langIds, boolean isVerbose, boolean plainView, boolean debug, String branchName);

    NewAction<NoProperties, NoClient> checkNewVersion();

    NewAction<PropertiesWithFiles, ProjectClient> preTranslate(
        List<String> languageIds, Method method, Long engineId, String branchName, AutoApproveOption autoApproveOption, Boolean duplicateTranslations,
        Boolean translateUntranslatedOnly, Boolean translateWithPerfectMatchOnly, boolean noProgress, boolean debug, boolean verbose, boolean plainView);

}
