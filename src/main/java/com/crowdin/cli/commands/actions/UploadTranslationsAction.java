package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.LanguageMapping;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.WrongLanguageException;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.*;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.concurrency.ConcurrencyUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.File;
import com.crowdin.client.translations.model.UploadTranslationsRequest;
import com.crowdin.client.translations.model.UploadTranslationsStringsRequest;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;

import java.io.FileInputStream;
import java.io.InputStream;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.SKIPPED;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

class UploadTranslationsAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private boolean noProgress;
    private String languageId;
    private String branchName;
    private boolean importEqSuggestions;
    private boolean autoApproveImported;
    private boolean translateHidden;
    private boolean debug;
    private boolean plainView;

    public UploadTranslationsAction(
        boolean noProgress, String languageId, String branchName, boolean importEqSuggestions,
        boolean autoApproveImported, boolean translateHidden, boolean debug, boolean plainView
    ) {
        this.noProgress = noProgress || plainView;
        this.languageId = languageId;
        this.branchName = branchName;
        this.importEqSuggestions = importEqSuggestions;
        this.autoApproveImported = autoApproveImported;
        this.translateHidden = translateHidden;
        this.debug = debug;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, PropertiesWithFiles pb, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, this.plainView, () -> client.downloadFullProject(this.branchName));
        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);

        if (!project.isManagerAccess()) {
            if (!plainView) {
                out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.no_manager_access")));
                return;
            } else {
                throw new ExitCodeExceptionMapper.ForbiddenException(RESOURCE_BUNDLE.getString("message.no_manager_access"));
            }
        }

        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(true), pb.getBasePath());

        LanguageMapping serverLanguageMapping = project.getLanguageMapping();

        List<Language> languages = (languageId != null)
            ? project.findLanguageById(languageId, true)
                .map(Collections::singletonList)
                .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.language_not_exist"), languageId)))
            : project.getProjectLanguages(false);

        for (FileBean file : pb.getFiles()) {
            List<String> fileSourcesWithoutIgnores = SourcesUtils
                .getFiles(pb.getBasePath(), file.getSource(), file.getIgnore(), placeholderUtil)
                .map(java.io.File::getAbsolutePath)
                .collect(Collectors.toList());

            String commonPath = (pb.getPreserveHierarchy())
                ? ""
                : SourcesUtils.getCommonPath(fileSourcesWithoutIgnores, pb.getBasePath());

            if (fileSourcesWithoutIgnores.isEmpty()) {
                if (!plainView) {
                    out.println(ERROR.withIcon(String.format(RESOURCE_BUNDLE.getString("error.no_sources"), file.getSource())));
                }
                continue;
            }
            List<Runnable> tasks = null;
            AtomicBoolean containsErrors = new AtomicBoolean(false);
            if (!isStringsBasedProject) {
                Map<String, File> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFiles());
                Map<java.io.File, Pair<List<Language>, UploadTranslationsRequest>> preparedRequests = new HashMap<>();
                String branchPath = (StringUtils.isNotEmpty(this.branchName) ? BranchUtils.normalizeBranchName(branchName) + Utils.PATH_SEPARATOR : "");
                fileSourcesWithoutIgnores.forEach(source -> {
                    String filePath = branchPath + (StringUtils.isNotEmpty(file.getDest())
                        ? PropertiesBeanUtils.prepareDest(file.getDest(), StringUtils.removeStart(source, pb.getBasePath()), placeholderUtil)
                        : StringUtils.removeStart(source, pb.getBasePath() + commonPath));

                    var sourceFile = ProjectFilesUtils.fileLookup(filePath, paths);
                    if (sourceFile == null) {
                        containsErrors.set(true);
                        if (!plainView) {
                            out.println(ERROR.withIcon(String.format(
                                RESOURCE_BUNDLE.getString("error.source_not_exists_in_project"),
                                StringUtils.removeStart(source, pb.getBasePath()), filePath)));
                        }
                        return;
                    }
                    Long fileId = sourceFile.getId();

//                build filePath to each source and project language
                    String fileSource = StringUtils.removeStart(source, pb.getBasePath());
                    String translation = TranslationsUtils.replaceDoubleAsterisk(file.getSource(), file.getTranslation(), fileSource);
                    translation = placeholderUtil.replaceFileDependentPlaceholders(translation, new java.io.File(source));
                    if (file.getScheme() != null && !PlaceholderUtil.containsLangPlaceholders(translation)) {
                        java.io.File transFile = getTranslationFile(out, pb, translation);
                        if (Objects.isNull(transFile)) return;
                        UploadTranslationsRequest request = RequestBuilder.uploadTranslations(fileId, importEqSuggestions, autoApproveImported, translateHidden);
                        preparedRequests.put(transFile, Pair.of(languages, request));
                    } else {
                        for (Language language : languages) {
                            java.io.File transFile = getTranslationFileWithPlaceholders(out, pb, placeholderUtil, serverLanguageMapping, file, translation, language);
                            if (Objects.isNull(transFile)) continue;
                            UploadTranslationsRequest request = RequestBuilder.uploadTranslations(fileId, importEqSuggestions, autoApproveImported, translateHidden);
                            preparedRequests.put(transFile, Pair.of(Collections.singletonList(language), request));
                        }
                    }
                });

                tasks = preparedRequests.entrySet()
                    .stream()
                    .map(entry -> (Runnable) () -> {
                        java.io.File translationFile = entry.getKey();
                        List<Language> langs = entry.getValue().getLeft();
                        UploadTranslationsRequest request = entry.getValue().getRight();
                        request.setStorageId(uploadToStorage(pb, client, containsErrors, translationFile));
                        try {
                            for (Language lang : langs) {
                                try {
                                    client.uploadTranslations(lang.getId(), request);
                                } catch (WrongLanguageException e) {
                                    out.println(WARNING.withIcon(String.format(
                                        RESOURCE_BUNDLE.getString("message.warning.file_not_uploaded_cause_of_language"),
                                        StringUtils.removeStart(translationFile.getAbsolutePath(), pb.getBasePath()), lang.getName())));
                                }
                            }
                        } catch (Exception e) {
                            containsErrors.set(true);
                            throw ExitCodeExceptionMapper.remap(e, String.format(
                                RESOURCE_BUNDLE.getString("error.upload_translation"),
                                StringUtils.removeStart(translationFile.getAbsolutePath(), pb.getBasePath())
                            ));
                        }
                        if (!plainView) {
                            out.println(OK.withIcon(String.format(
                                RESOURCE_BUNDLE.getString("message.uploading_file"),
                                StringUtils.removeStart(translationFile.getAbsolutePath(), pb.getBasePath()))));
                        } else {
                            out.println(StringUtils.removeStart(translationFile.getAbsolutePath(), pb.getBasePath()));
                        }
                    })
                    .collect(Collectors.toList());
            } else {
                Map<java.io.File, Pair<List<Language>, UploadTranslationsStringsRequest>> preparedRequests = new HashMap<>();
                Branch branch = project.findBranchByName(branchName)
                    .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.branch_required_string_project")));
                fileSourcesWithoutIgnores.forEach(source -> {
                    String fileSource = StringUtils.removeStart(source, pb.getBasePath());
                    String translation = TranslationsUtils.replaceDoubleAsterisk(file.getSource(), file.getTranslation(), fileSource);
                    translation = placeholderUtil.replaceFileDependentPlaceholders(translation, new java.io.File(source));
                    if (file.getScheme() != null && !PlaceholderUtil.containsLangPlaceholders(translation)) {
                        java.io.File transFile = getTranslationFile(out, pb, translation);
                        if (Objects.isNull(transFile)) return;
                        UploadTranslationsStringsRequest request = RequestBuilder.uploadTranslationsStrings(branch.getId(), importEqSuggestions, autoApproveImported, translateHidden);
                        preparedRequests.put(transFile, Pair.of(languages, request));
                    } else {
                        for (Language language : languages) {
                            java.io.File transFile = getTranslationFileWithPlaceholders(out, pb, placeholderUtil, serverLanguageMapping, file, translation, language);
                            if (Objects.isNull(transFile)) continue;
                            UploadTranslationsStringsRequest request = RequestBuilder.uploadTranslationsStrings(branch.getId(), importEqSuggestions, autoApproveImported, translateHidden);
                            preparedRequests.put(transFile, Pair.of(Collections.singletonList(language), request));
                        }
                    }

                });
                tasks = preparedRequests.entrySet()
                    .stream()
                    .map(entry -> (Runnable) () -> {
                        java.io.File translationFile = entry.getKey();
                        List<Language> langs = entry.getValue().getLeft();
                        UploadTranslationsStringsRequest request = entry.getValue().getRight();
                        request.setStorageId(uploadToStorage(pb, client, containsErrors, translationFile));
                        try {
                            for (Language lang : langs) {
                                client.uploadTranslationStringsBased(lang.getId(), request);
                            }
                        } catch (Exception e) {
                            containsErrors.set(true);
                            throw ExitCodeExceptionMapper.remap(e, String.format(
                                RESOURCE_BUNDLE.getString("error.upload_translation"),
                                StringUtils.removeStart(translationFile.getAbsolutePath(), pb.getBasePath())
                            ));
                        }
                        if (!plainView) {
                            out.println(OK.withIcon(String.format(
                                RESOURCE_BUNDLE.getString("message.uploading_file"),
                                StringUtils.removeStart(translationFile.getAbsolutePath(), pb.getBasePath()))));
                        } else {
                            out.println(StringUtils.removeStart(translationFile.getAbsolutePath(), pb.getBasePath()));
                        }
                    })
                    .collect(Collectors.toList());
            }
            if (isStringsBasedProject) {
                ConcurrencyUtil.executeAndWaitSingleThread(tasks, debug);
            } else {
                ConcurrencyUtil.executeAndWait(tasks, debug);
            }

            if (containsErrors.get()) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.execution_contains_errors"));
            }
        }
    }

    private Long uploadToStorage(PropertiesWithFiles pb, ProjectClient client, AtomicBoolean containsErrors, java.io.File translationFile) {
        try (InputStream fileStream = new FileInputStream(translationFile)) {
            Long storageId = client.uploadStorage(translationFile.getName(), fileStream);
            return storageId;
        } catch (Exception e) {
            containsErrors.set(true);
            throw ExitCodeExceptionMapper.remap(e, String.format(
                RESOURCE_BUNDLE.getString("error.upload_translation_to_storage"),
                StringUtils.removeStart(translationFile.getAbsolutePath(), pb.getBasePath())
            ));
        }
    }

    private java.io.File getTranslationFileWithPlaceholders(Outputter out, PropertiesWithFiles pb, PlaceholderUtil placeholderUtil, LanguageMapping serverLanguageMapping, FileBean file, String translation, Language language) {
        LanguageMapping localLanguageMapping =
            LanguageMapping.fromConfigFileLanguageMapping(file.getLanguagesMapping());
        LanguageMapping languageMapping =
            LanguageMapping.populate(localLanguageMapping, serverLanguageMapping);

        String transFileName = placeholderUtil.replaceLanguageDependentPlaceholders(translation, languageMapping, language);
        transFileName = PropertiesBeanUtils.useTranslationReplace(transFileName, file.getTranslationReplace());
        return getTranslationFile(out, pb, transFileName);
    }

    private java.io.File getTranslationFile(Outputter out, PropertiesWithFiles pb, String translation) {
        java.io.File transFile = new java.io.File(pb.getBasePath() + Utils.PATH_SEPARATOR + translation);
        if (!transFile.exists()) {
            if (!plainView) {
                out.println(SKIPPED.withIcon(String.format(
                    RESOURCE_BUNDLE.getString("error.translation_not_exists"),
                    StringUtils.removeStart(transFile.getAbsolutePath(), pb.getBasePath()))));
            }
            return null;
        }
        return transFile;
    }
}
