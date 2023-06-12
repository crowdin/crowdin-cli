package com.crowdin.cli.commands;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.*;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.NoProperties;
import com.crowdin.cli.properties.PropertiesWithTargets;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.client.core.model.Priority;
import com.crowdin.client.glossaries.model.GlossariesFormat;
import com.crowdin.client.stringcomments.model.Type;
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

    NewAction<NoProperties, NoClient> generate(FilesInterface files, Path destinationPath, boolean skipGenerateDescription);

    NewAction<ProjectProperties, ProjectClient> listBranches(boolean noProgress, boolean plainView);

    NewAction<ProjectProperties, ProjectClient> listProject(
        boolean noProgress, String branchName, boolean treeView, boolean plainView);

    NewAction<PropertiesWithFiles, ProjectClient> listSources(
        boolean deleteObsolete, String branchName, boolean noProgress, boolean treeView, boolean plainView);

    NewAction<PropertiesWithFiles, ProjectClient> listTranslations(
        boolean noProgress, boolean treeView, boolean isLocal, boolean plainView, boolean useServerSources, boolean withInContextLang);

    NewAction<ProjectProperties, ProjectClient> listLanguages(BaseCli.LanguageCode code, boolean noProgress, boolean plainView);

    NewAction<ProjectProperties, ProjectClient> status(
        boolean noProgress, String branchName, String languageId, boolean isVerbose, boolean showTranslated, boolean showApproved, boolean failIfIncomplete);

    NewAction<ProjectProperties, ProjectClient> stringAdd(
        boolean noProgress, String text, String identifier, Integer maxLength, String context, List<String> files, List<String> labelNames, Boolean hidden);

    NewAction<ProjectProperties, ProjectClient> stringComment(boolean plainView,
        boolean noProgress, String text, String stringId, String language, String type, String issueType);

    NewAction<ProjectProperties, ProjectClient> stringDelete(
        boolean noProgress, List<Long> ids, List<String> texts, List<String> identifiers);

    NewAction<ProjectProperties, ProjectClient> stringEdit(
        boolean noProgress, Long id, String identifier, String newText, String newContext, Integer newMaxLength, List<String> labelNames, Boolean isHidden);

    NewAction<ProjectProperties, ProjectClient> stringList(
        boolean noProgress, boolean isVerbose, String file, String filter, String branchName, String croql);

    NewAction<PropertiesWithFiles, ProjectClient> uploadSources(
        String branchName, boolean deleteObsolete, boolean noProgress, boolean autoUpdate, boolean debug, boolean plainView);

    NewAction<PropertiesWithFiles, ProjectClient> uploadTranslations(
        boolean noProgress, String languageId, String branchName, boolean importEqSuggestions,
        boolean autoApproveImported, boolean translateHidden, boolean debug, boolean plainView);

    NewAction<BaseProperties, ClientGlossary> glossaryList(boolean plainView, boolean isVerbose);

    NewAction<BaseProperties, ClientGlossary> glossaryUpload(
        java.io.File file, Long id, String name, String languageId, Map<String, Integer> scheme, Boolean firstLineContainsHeader);

    NewAction<BaseProperties, ClientGlossary> glossaryDownload(
        Long id, String name, GlossariesFormat format, boolean noProgress, File to, FilesInterface files);

    NewAction<BaseProperties, ClientTm> tmList(boolean plainView);

    NewAction<BaseProperties, ClientTm> tmUpload(
        File file, Long id, String name, String languageId, Map<String, Integer> scheme, Boolean firstLineContainsHeader);

    NewAction<BaseProperties, ClientTm> tmDownload(
        Long id, String name, TranslationMemoryFormat format, String sourceLanguageId,
        String targetLanguageId, boolean noProgress, File to, FilesInterface files);

    NewAction<ProjectProperties, ClientTask> taskList(boolean plainView, boolean isVerbose, String status, Long assigneeId);

    NewAction<ProjectProperties, ClientTask> taskAdd(String title, Integer type, String language, List<Long> fileId, Long workflowStep, String description, boolean skipAssignedStrings, boolean skipUntranslatedStrings, List<Long> labels);

    NewAction<ProjectProperties, ClientComment> commentList(boolean plainView, boolean isVerbose, String stringId, com.crowdin.client.stringcomments.model.Type type, com.crowdin.client.issues.model.Type issueType, IssueStatus status);

    NewAction<ProjectProperties, ClientComment> resolve(Long id);

    NewAction<ProjectProperties, ClientBundle> bundleList(boolean plainView, boolean isVerbose);

    NewAction<ProjectProperties, ClientBundle> bundleAdd(String name, String format, List<String> source, List<String> ignore, String translation, List<Long> labels, boolean plainView);

    NewAction<PropertiesWithTargets, ProjectClient> downloadTargets(
        List<String> targetNames, FilesInterface files, boolean noProgress,
        List<String> langIds, boolean isVerbose, boolean plainView, boolean debug, String branchName);

    NewAction<NoProperties, NoClient> checkNewVersion();

    NewAction<PropertiesWithFiles, ProjectClient> preTranslate(
        List<String> languageIds, Method method, Long engineId, String branchName, AutoApproveOption autoApproveOption, Boolean duplicateTranslations,
        Boolean translateUntranslatedOnly, Boolean translateWithPerfectMatchOnly, boolean noProgress, boolean debug, boolean verbose, boolean plainView);

    NewAction<ProjectProperties, ProjectClient> branchAdd(String name, String title, String exportPattern, Priority priority);

    NewAction<ProjectProperties, ProjectClient> branchDelete(String name);

}
