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

import static java.util.Objects.nonNull;

@AllArgsConstructor
class ContextStatusAction implements NewAction<ProjectProperties, ProjectClient> {

    private final List<String> filesFilter;
    private final List<String> labelsFilter;
    private final String branchFilter;
    private final String croqlFilter;
    private final LocalDate sinceFilter;
    private final boolean byFile;
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

        out.println(String.format("Context Status for Project \"%s\" (ID: %d)", project.getProject().getName(), project.getProjectId()));
        out.println("");

        if (byFile && !isStringsBasedProject) {
            Map<Long, String> filesMap = project.getFileInfos().stream()
                    .collect(Collectors.toMap(FileInfo::getId, FileInfo::getPath));
            Map<String, Stats> groupByFile = strings
                    .stream()
                    .collect(
                            Collectors.groupingBy(
                                    string -> filesMap.get(string.getFileId()),
                                    Collectors.collectingAndThen(
                                            Collectors.toList(),
                                            this::calculateStats
                                    )
                            )
                    );
            int longestFilePathLength = groupByFile.keySet().stream().mapToInt(String::length).max().orElse(0);

            String headerFormat = "%-" + longestFilePathLength + "s   %8s   %14s   %8s";
            String rowFormat = "%-" + longestFilePathLength + "s   %8d   %6d (%.2f%%)   %8d";

            out.println(String.format(
                    headerFormat,
                    "File",
                    "Total",
                    "AI Context",
                    "Missing"
            ));

            groupByFile.forEach((path, stats) -> {
                out.println(String.format(
                        rowFormat,
                        path,
                        stats.total,
                        stats.withAi,
                        stats.withAiPercentage,
                        stats.total - stats.withAi
                ));
            });

        } else {
            var stats = calculateStats(strings);

            out.println(String.format("Total strings:       %d", stats.total));
            out.println(String.format("With AI context:     %d (%.2f%%)", stats.withAi, stats.withAiPercentage));
            out.println(String.format("Without AI context:  %d (%.2f%%)", stats.withoutAi, stats.withoutAiPercentage));
            out.println(String.format("With manual context: %d (%.2f%%)", stats.withManual, stats.withManualPercentage));
        }

        out.println("");
        out.println("Run 'crowdin context download --status=empty' to export strings needing context.");
    }

    private Stats calculateStats(List<SourceString> strings) {
        var stringsWithAiContext = strings.stream()
                .filter(string -> !AiContextUtil.getAiContextSection(string.getContext()).isEmpty())
                .count();

        var stringsWithoutAiContext = strings.stream()
                .filter(string -> AiContextUtil.getAiContextSection(string.getContext()).isEmpty())
                .count();

        var stringsWithManualContext = strings.stream()
                .filter(string -> !AiContextUtil.getManualContext(string.getContext()).isEmpty())
                .count();

        return new Stats(
                strings.size(),
                stringsWithAiContext,
                percentageValue(stringsWithAiContext, strings.size()),
                stringsWithoutAiContext,
                percentageValue(stringsWithoutAiContext, strings.size()),
                stringsWithManualContext,
                percentageValue(stringsWithManualContext, strings.size())
        );
    }

    private record Stats(
            long total,
            long withAi,
            double withAiPercentage,
            long withoutAi,
            double withoutAiPercentage,
            long withManual,
            double withManualPercentage
    ) {
    }

    private double percentageValue(long target, long total) {
        return (double) target / total * 100;
    }
}
