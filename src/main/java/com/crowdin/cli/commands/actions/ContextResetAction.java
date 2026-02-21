package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.helper.FileHelper;
import com.crowdin.cli.utils.AiContextUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.core.model.PatchOperation;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.sourcestrings.model.SourceString;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;
import static java.util.Objects.nonNull;

@AllArgsConstructor
class ContextResetAction implements NewAction<ProjectProperties, ProjectClient> {

    private final List<String> filesFilter;
    private final List<String> labelsFilter;
    private final String branchFilter;
    private final String croqlFilter;
    private final LocalDate sinceFilter;
    private final boolean dryRun;
    private final int batchSize;
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
                    .filter(file -> this.filesFilter.stream().anyMatch(filter -> FileHelper.isPathMatch(file.getPath(), filter)))
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
                .filter(string -> !AiContextUtil.getAiContextSection(string.getContext()).isEmpty())
                .toList();

        if (strings.isEmpty()) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.source_string_list_not_found")));
            return;
        }

        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("messages.context.downloaded_strings"), strings.size())));

        if (dryRun) {
            strings.forEach(string -> {
                if (!plainView) {
                    out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("messages.context.string_reset_dryrun"), string.getId(), string.getText(), AiContextUtil.getManualContext(string.getContext()))));
                } else {
                    out.println(string.getId() + ": " + string.getText() + " | " + AiContextUtil.getManualContext(string.getContext()));
                }
            });
            return;
        }

        List<PatchRequest> batchContextEdit = strings.stream()
                .map(string -> {
                    var request = new PatchRequest();
                    request.setOp(PatchOperation.REPLACE);
                    request.setPath("/" + string.getId() + "/context");
                    request.setValue(AiContextUtil.getManualContext(string.getContext()));
                    return request;
                })
                .toList();

        for (int i = 0; i < batchContextEdit.size(); i += batchSize) {
            int end = Math.min(i + batchSize, batchContextEdit.size());
            client.batchEditSourceStrings(batchContextEdit.subList(i, end));
            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("messages.context.strings_reset_success"), end, batchContextEdit.size())));
        }
    }
}
