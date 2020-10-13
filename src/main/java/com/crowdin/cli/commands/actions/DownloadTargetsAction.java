package com.crowdin.cli.commands.actions;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.TargetBean;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.concurrency.ConcurrencyUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.translations.model.ExportPrjoectTranslationRequest;
import lombok.NonNull;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.tuple.Pair;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.FILE_FORMAT_MAPPER;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

public class DownloadTargetsAction implements ClientAction {

    private List<String> targetNames;
    private FilesInterface files;
    private boolean noProgress;
    private List<String> langIds;
    private boolean isVerbose;
    private Boolean skipTranslatedOnly;
    private Boolean skipUntranslatedFiles;
    private Boolean exportApprovedOnly;
    private boolean plainView;
    private boolean debug;

    public DownloadTargetsAction(
        @NonNull List<String> targetNames, FilesInterface files, boolean noProgress, List<String> langIds, boolean isVerbose,
        Boolean skipTranslatedOnly, Boolean skipUntranslatedFiles, Boolean exportApprovedOnly, boolean plainView, boolean debug
    ) {
        this.targetNames = targetNames;
        this.files = files;
        this.noProgress = noProgress;
        this.langIds = langIds;
        this.isVerbose = isVerbose;
        this.skipTranslatedOnly = skipTranslatedOnly;
        this.skipUntranslatedFiles = skipUntranslatedFiles;
        this.exportApprovedOnly = exportApprovedOnly;
        this.plainView = plainView;
        this.debug = debug;
    }

    @Override
    public void act(Outputter out, PropertiesBean pb, Client client) {
        CrowdinProjectFull project = ConsoleSpinner
            .execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, this.plainView, client::downloadFullProject);

        PlaceholderUtil placeholderUtil =
            new PlaceholderUtil(
                project.getSupportedLanguages(), project.getProjectLanguages(true), pb.getBasePath());

        Map<String, Long> projectFiles = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFileInfos())
            .entrySet().stream()
            .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().getId()));
        Map<String, Long> projectDirs = ProjectFilesUtils.buildDirectoryPaths(project.getDirectories())
            .entrySet().stream()
            .collect(Collectors.toMap(Map.Entry::getValue, Map.Entry::getKey));
        Map<String, Long> projectBranches = project.getBranches()
            .values().stream()
            .collect(Collectors.toMap(Branch::getName, Branch::getId));

        List<TargetBean> targetBeans = ((targetNames.size() == 1 && targetNames.get(0).equals(BaseCli.ALL)) || targetNames.isEmpty())
            ? pb.getTargets()
            : pb.getTargets().stream()
                .filter(tb -> targetNames.contains(tb.getName()))
                .collect(Collectors.toList());

        for (TargetBean tb : targetBeans) {

            List<Runnable> tasks = tb.getFiles().stream()
                .flatMap(fb -> {
                    List<String> errors = new ArrayList<>();

                    if (!FILE_FORMAT_MAPPER.containsKey(FilenameUtils.getExtension(fb.getTarget()))) {
                        errors.add(String.format("Crowdin doesn't support '%s' file format", FilenameUtils.getExtension(fb.getTarget())));
                    }
                    String exportFileFormat = FILE_FORMAT_MAPPER.get(FilenameUtils.getExtension(fb.getTarget()));

                    Integer exportWithMinApprovalsCount = null;//(exportApprovedOnly != null && exportApprovedOnly) ? 1 : 0; // waiting for api updates
                    ExportPrjoectTranslationRequest templateRequest = RequestBuilder.exportProjectTranslation(exportFileFormat, skipTranslatedOnly, skipUntranslatedFiles, exportWithMinApprovalsCount);
                    if (fb.getSources() != null && !fb.getSources().isEmpty()) {
                        List<Long> sourceIds = new ArrayList<>();
                        for (String source : fb.getSources()) {
                            if (projectFiles.containsKey(source)) {
                                sourceIds.add(projectFiles.get(source));
                            } else {
                                errors.add(String.format("Couldn't find '%s' file in project", source));
                            }
                        }
                        templateRequest.setFileIds(sourceIds);
                    } else if (fb.getSourceDirs() != null && !fb.getSourceDirs().isEmpty()) {
                        List<Long> dirIds = new ArrayList<>();
                        for (String dir : fb.getSourceDirs()) {
                            if (projectDirs.containsKey(dir)) {
                                dirIds.add(projectDirs.get(dir));
                            } else {
                                errors.add(String.format("Couldn't find '%s' directory in project", dir));
                            }
                        }
                        templateRequest.setDirectoryIds(dirIds);
                    } else if (fb.getSourceBranches() != null && !fb.getSourceBranches().isEmpty()) {
                        List<Long> branchIds = new ArrayList<>();
                        for (String branch : fb.getSourceDirs()) {
                            if (projectBranches.containsKey(branch)) {
                                branchIds.add(projectBranches.get(branch));
                            } else {
                                errors.add(String.format("Couldn't find '%s' branch in project", branch));
                            }
                        }
                        templateRequest.setBranchIds(branchIds);
                    } else {
                        throw new RuntimeException("Unexpected error: no source identifiers");
                    }

                    Map<String, Language> projectLanguages = project.getProjectLanguages(false)
                        .stream()
                        .collect(Collectors.toMap(Language::getId, Function.identity()));

                    List<Pair<String, ExportPrjoectTranslationRequest>> builtRequests = new ArrayList<>();
                    for(String langId : langIds) {
                        if (!projectLanguages.containsKey(langId)) {
                            errors.add(String.format("Coudln't find '%s' language", langId));
                            continue;
                        }
                        ExportPrjoectTranslationRequest request = RequestBuilder.exportProjectTranslation(templateRequest);
                        request.setTargetLanguageId(langId);
                        String targetFileLang = placeholderUtil.replaceLanguageDependentPlaceholders(fb.getTarget(), projectLanguages.get(langId));
                        builtRequests.add(Pair.of(targetFileLang, request));
                    }

                    if (!errors.isEmpty()) {
                        String listOfErrors = errors.stream()
                            .map(er -> String.format("\t- %s", er))
                            .collect(Collectors.joining("\n"));
                        throw new RuntimeException(String.format("Errors presented in '%s' target\n%s", tb.getName(), listOfErrors));
                    }
                    return builtRequests.stream();
                })
                .map(builtRequest -> (Runnable) () -> {
                    String targetFile = builtRequest.getLeft();
                    ExportPrjoectTranslationRequest request = builtRequest.getRight();

                    URL downloadUrl = client.exportProjectTranslation(request);
                    try (InputStream data = downloadUrl.openStream()) {
                        files.writeToFile(targetFile, data);
                    } catch (IOException e) {
                        throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.write_file"), targetFile), e);
                    }
                    out.println(OK.withIcon(String.format("@|fg(green) Successfully executed|@ @|fg(green),bold '%s'|@ @|fg(green) target for|@ @|fg(green),bold %s|@ @|fg(green) language|@", tb.getName(), builtRequest.getValue().getTargetLanguageId())));
                })
                .collect(Collectors.toList());

            ConcurrencyUtil.executeAndWait(tasks, debug);
        }

        if (pb.getTargets().isEmpty()) {
            out.println(WARNING.withIcon("Couldn't find any targets to execute"));
        }
    }

}
