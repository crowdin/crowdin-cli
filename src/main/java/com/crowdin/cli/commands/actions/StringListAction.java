package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.sourcestrings.model.SourceString;
import org.apache.commons.lang3.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

class StringListAction implements NewAction<ProjectProperties, ProjectClient> {

    private final boolean noProgress;
    private final boolean isVerbose;
    private final String file;
    private final String filter;
    private final String branchName;
    private final String croql;

    public StringListAction(boolean noProgress, boolean isVerbose, String file, String filter, String branchName, String croql) {
        this.noProgress = noProgress;
        this.isVerbose = isVerbose;
        this.file = file;
        this.filter = filter;
        this.branchName = branchName;
        this.croql = croql;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, false, () -> client.downloadFullProject(this.branchName));

        Long branchId = Optional.ofNullable(project.getBranch())
            .map(Branch::getId)
            .orElse(null);

        Map<Long, String> labels = client.listLabels().stream()
            .collect(Collectors.toMap(Label::getId, Label::getTitle));

        Map<String, FileInfo> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFileInfos());
        Map<Long, String> reversePaths = paths.entrySet()
            .stream()
            .collect(Collectors.toMap((entry) -> entry.getValue().getId(), Map.Entry::getKey));

        String encodedFilter = filter != null ? Utils.encodeURL(filter) : null;
        String encodedCroql = croql != null ? Utils.encodeURL(croql) : null;

        List<SourceString> sourceStrings;
        if (StringUtils.isEmpty(file)) {
            sourceStrings = client.listSourceString(null, branchId, null, encodedFilter, encodedCroql);
        } else {
            if (paths.containsKey(file)) {
                sourceStrings = client.listSourceString(paths.get(file).getId(), branchId, null, encodedFilter, encodedCroql);
            } else {
                throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), file));
            }
        }
        if (sourceStrings.isEmpty()) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.source_string_list_not_found")));
        }
        sourceStrings.forEach(ss -> {
            String labelsString = (ss.getLabelIds() != null)
                ? ss.getLabelIds().stream().map(labels::get).map(s -> String.format("[@|cyan %s|@]", s)).collect(Collectors.joining(" "))
                : "";
            out.println(String.format(RESOURCE_BUNDLE.getString("message.source_string_list_text"), ss.getId(), ss.getText(), labelsString));
            if (isVerbose) {
                if (ss.getIdentifier() != null) {
                    out.println(String.format("\t- @|bold identifier|@: '%s'", ss.getIdentifier()));
                }
                if (ss.getContext() != null) {
                    out.println(String.format(
                        RESOURCE_BUNDLE.getString("message.source_string_list_context"), ss.getContext().trim().replaceAll("\n", "\n\t\t")));
                }
                if (ss.getFileId() != null) {
                    out.println(String.format(RESOURCE_BUNDLE.getString("message.source_string_list_file"), reversePaths.get(ss.getFileId())));
                }
                if (ss.getMaxLength() != null && ss.getMaxLength() != 0) {
                    out.println(String.format(RESOURCE_BUNDLE.getString("message.source_string_list_max_length"), ss.getMaxLength()));
                }
            }
        });
    }
}
