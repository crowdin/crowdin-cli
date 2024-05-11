package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.BranchUtils;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.sourcestrings.model.SourceString;
import org.apache.commons.lang3.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;
import static java.util.Objects.nonNull;

class StringListAction implements NewAction<ProjectProperties, ProjectClient> {

    private final boolean noProgress;
    private final boolean isVerbose;
    private final String file;
    private final String filter;
    private final String branchName;
    private final List<String> labelNames;
    private final String croql;
    private final String directory;
    private final String scope;

    public StringListAction(boolean noProgress, boolean isVerbose, String file, String filter, String branchName, List<String> labelNames, String croql, String directory, String scope) {
        this.noProgress = noProgress;
        this.isVerbose = isVerbose;
        this.file = file;
        this.filter = filter;
        this.branchName = branchName;
        this.labelNames = labelNames;
        this.croql = croql;
        this.directory = directory;
        this.scope = scope;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, false, () -> client.downloadFullProject(this.branchName));
        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);

        Long branchId = Optional.ofNullable(project.getBranch())
                .map(Branch::getId)
                .orElse(null);

        List<Label> labels = client.listLabels();
        Map<Long, String> labelsMap = labels.stream()
                .collect(Collectors.toMap(Label::getId, Label::getTitle));

        Map<String, FileInfo> paths = null;
        Map<Long, String> reversePaths = null;
        if (!isStringsBasedProject) {
            paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFileInfos());
            reversePaths = paths.entrySet()
                    .stream()
                    .collect(Collectors.toMap((entry) -> entry.getValue().getId(), Map.Entry::getKey));
        }
        Map<Long, String> finalReversePaths = reversePaths;

        String encodedFilter = nonNull(filter) ? Utils.encodeURL(filter) : null;
        String encodedCroql = nonNull(croql) ? Utils.encodeURL(croql) : null;
        String labelIds = nonNull(labelNames) ? prepareLabelIds(labels) : null;
        String fullPath = nonNull(branchName) ? (BranchUtils.normalizeBranchName(branchName) + Utils.PATH_SEPARATOR + file) : file;

        if ((!StringUtils.isEmpty(file) || Objects.nonNull(directory)) && isStringsBasedProject) {
            throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("message.no_file_string_project"));
        }

        Long directoryId = null;

        if (!StringUtils.isEmpty(directory)) {
            String directoryPath = Utils.toUnixPath(Utils.sepAtStart(directory));
            directoryId = project.getDirectories().values().stream()
                    .filter(d -> directoryPath.equals(d.getPath()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.dir_not_exists"), directory)))
                    .getId();
        }

        List<SourceString> sourceStrings;
        if (StringUtils.isEmpty(file)) {
            sourceStrings = client.listSourceString(null, branchId, labelIds, encodedFilter, encodedCroql, directoryId, scope);
        } else {
            if (paths.containsKey(fullPath)) {
                sourceStrings = client.listSourceString(paths.get(fullPath).getId(), branchId, labelIds, encodedFilter, encodedCroql, directoryId, scope);
            } else {
                throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), fullPath));
            }
        }
        if (sourceStrings.isEmpty()) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.source_string_list_not_found")));
        }
        sourceStrings.forEach(ss -> printSourceString(ss, labelsMap, out, isStringsBasedProject, finalReversePaths, isVerbose));
    }

    public static void printSourceString(
            SourceString ss,
            Map<Long, String> labelsMap,
            Outputter out,
            boolean isStringsBasedProject,
            Map<Long, String> finalReversePaths,
            boolean isVerbose
    ) {
        String labelsString = (ss.getLabelIds() != null)
                ? ss.getLabelIds().stream().map(labelsMap::get).map(s -> String.format("@|cyan %s|@", s)).collect(Collectors.joining(", "))
                : "";
        StringBuilder text = new StringBuilder();
        if (ss.getText() instanceof HashMap<?, ?>) {
            HashMap<?, ?> map = (HashMap<?, ?>) ss.getText();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                text.append(entry.getKey()).append(": ").append(entry.getValue()).append(" | ");
            }
            if (text.length() > 0) {
                text.delete(text.length() - 3, text.length());
            }
        } else {
            text.append((String) ss.getText());
        }
        if (ss.getIdentifier() == null) {
            out.println(String.format(RESOURCE_BUNDLE.getString("message.source_string_list_text_short"), ss.getId(), text));
        } else {
            out.println(String.format(RESOURCE_BUNDLE.getString("message.source_string_list_text"), ss.getId(), ss.getIdentifier(), text));
        }
        if (isVerbose) {
            if (!isStringsBasedProject && (ss.getFileId() != null)) {
                out.println(String.format(RESOURCE_BUNDLE.getString("message.source_string_list_file"), finalReversePaths.get(ss.getFileId())));
            }
            if (!StringUtils.isEmpty(labelsString)) {
                out.println(String.format(RESOURCE_BUNDLE.getString("message.source_string_list_labels"), labelsString));
            }
            if (ss.getContext() != null) {
                out.println(String.format(
                        RESOURCE_BUNDLE.getString("message.source_string_list_context"), ss.getContext().trim().replaceAll("\n", "\n\t\t")));
            }
        }
    }

    private String prepareLabelIds(List<Label> labels) {
        Map<String, Long> labelsMap = labels.stream()
                .collect(Collectors.toMap(Label::getTitle, Label::getId));

        return labelNames.stream()
                .map(labelsMap::get)
                .map(String::valueOf)
                .collect(Collectors.joining(","));
    }
}
