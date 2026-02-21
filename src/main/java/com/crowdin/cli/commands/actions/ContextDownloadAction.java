package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.AiContextUtil;
import com.crowdin.cli.utils.GlobUtil;
import com.crowdin.cli.utils.StringUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.sourcestrings.model.SourceString;
import lombok.AllArgsConstructor;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;
import static java.nio.charset.StandardCharsets.UTF_8;
import static java.util.Objects.nonNull;

@AllArgsConstructor
class ContextDownloadAction implements NewAction<ProjectProperties, ProjectClient> {

    private final File to;
    private final List<String> filesFilter;
    private final List<String> labelsFilter;
    private final String branchFilter;
    private final String croqlFilter;
    private final LocalDate sinceFilter;
    private final String statusFilter;
    private final String outputFormat;
    private final FilesInterface files;
    private final boolean plainView;
    private final boolean noProgress;

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {

        CrowdinProjectFull project = ConsoleSpinner.execute(
                out,
                "message.spinner.fetching_project_info",
                "error.collect_project_info",
                this.noProgress,
                this.plainView,
                () -> client.downloadFullProject(this.branchFilter)
        );

        List<AiContextUtil.StringContextRecord> existingRecords = to.exists() ? AiContextUtil.readRecords(to) : List.of();

        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);

        Long branchId = Optional.ofNullable(project.getBranch())
                .map(Branch::getId)
                .orElse(null);

        Map<String, Long> labelsMap = client.listLabels().stream()
                .collect(Collectors.toMap(Label::getTitle, Label::getId, (existing, replacement) -> existing));

        String filterLabelsStr = Optional
                .ofNullable(this.labelsFilter)
                .filter(list -> !list.isEmpty())
                .map(list -> list.stream()
                        .filter(labelsMap::containsKey)
                        .map(label -> labelsMap.get(label).toString())
                        .collect(Collectors.joining(",")))
                .orElse(null);

        String encodedCroql = nonNull(croqlFilter) ? Utils.encodeURL(croqlFilter) : null;

        List<Long> fileIds = null;

        if (!isStringsBasedProject && nonNull(this.filesFilter) && !this.filesFilter.isEmpty()) {
            fileIds = project.getFileInfos().stream()
                    .filter(file -> this.filesFilter.stream().anyMatch(filter -> GlobUtil.matches(filter, file.getPath())))
                    .map(FileInfo::getId)
                    .toList();
        }

        List<SourceString> strings = new ArrayList<>();

        if (isStringsBasedProject) {
            strings = client.listSourceString(null, branchId, filterLabelsStr, null, encodedCroql, null, null);
        } else {
            if (nonNull(fileIds) && !fileIds.isEmpty()) {
                for (Long fileId : fileIds) {
                    strings.addAll(client.listSourceString(fileId, branchId, filterLabelsStr, null, encodedCroql, null, null));
                }
            } else {
                strings = client.listSourceString(null, branchId, filterLabelsStr, null, encodedCroql, null, null);
            }
        }

        strings = strings.stream()
                .filter(string -> {
                    if (sinceFilter == null) {
                        return true;
                    }
                    var createdDate = string.getCreatedAt().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();

                    return createdDate.isAfter(sinceFilter) || createdDate.isEqual(sinceFilter);
                })
                .toList();

        strings = strings.stream()
                .filter(string -> {
                    if (statusFilter == null) {
                        return true;
                    }

                    switch (statusFilter) {
                        case "empty" -> {
                            return string.getContext() == null || string.getContext().isEmpty();
                        }
                        case "ai" -> {
                            String aiContextSection = AiContextUtil.getAiContextSection(string.getContext());
                            return !aiContextSection.isEmpty();
                        }
                        case "manual" -> {
                            String manualContext = AiContextUtil.getManualContext(string.getContext());
                            return !manualContext.isEmpty();
                        }
                        default -> {
                            return true;
                        }
                    }
                })
                .toList();

        if (strings.isEmpty()) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.source_string_list_not_found")));
            return;
        }

        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("messages.context.downloaded_strings"), strings.size())));

        if (outputFormat.equals("jsonl")) {
            String jsonlOutput = strings.stream()
                    .map(string -> {
                        String filePath = isStringsBasedProject
                                ? ""
                                : project.getFileInfos().stream()
                                .filter(file -> string.getFileId() != null && file.getId().equals(string.getFileId()))
                                .findFirst()
                                .map(FileInfo::getPath)
                                .orElse("");

                        var existingRecord = existingRecords.stream()
                                .filter(record -> record.getId().equals(string.getId()))
                                .findFirst();

                        var stringContextRow = new AiContextUtil.StringContextRecord(
                                string.getId(),
                                string.getIdentifier() != null ? string.getIdentifier() : "",
                                StringUtil.getStringText(string),
                                filePath,
                                AiContextUtil.getManualContext(string.getContext()),
                                existingRecord
                                        .map(AiContextUtil.StringContextRecord::getAi_context)
                                        .orElseGet(() -> AiContextUtil.getAiContextSection(string.getContext()))
                        );

                        return new JSONObject(stringContextRow).toString();
                    })
                    .collect(Collectors.joining("\n"));

            try {
                files.writeToFile(to.toString(), new ByteArrayInputStream(jsonlOutput.getBytes(UTF_8)));
                out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("messages.context.saved_strings"), to)));
            } catch (IOException e) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.write_file"), e);
            }
        }
    }
}
