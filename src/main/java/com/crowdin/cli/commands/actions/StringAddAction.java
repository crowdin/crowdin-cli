package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.BranchUtils;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.sourcestrings.model.AddSourcePluralStringRequest;
import com.crowdin.client.sourcestrings.model.AddSourcePluralStringStringsBasedRequest;
import com.crowdin.client.sourcestrings.model.AddSourceStringRequest;
import com.crowdin.client.sourcestrings.model.AddSourceStringStringsBasedRequest;
import lombok.Data;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

@Data
class StringAddAction implements NewAction<ProjectProperties, ProjectClient> {

    private final boolean noProgress;
    private final String text;
    private final String identifier;
    private final Integer maxLength;
    private final String context;
    private final List<String> files;
    private final List<String> labelNames;
    private final String branchName;
    private final Boolean hidden;
    private final String one;
    private final String two;
    private final String few;
    private final String many;
    private final String zero;

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, false, client::downloadFullProject);
        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);
        boolean isPluralString = one != null || two != null || few != null || many != null || zero != null;

        List<Long> labelIds = (labelNames != null && !labelNames.isEmpty()) ? this.prepareLabelIds(client) : null;
        if (isStringsBasedProject) {
            if (files != null || !files.isEmpty()) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("message.no_file_string_project"));
            }
            Branch branch = BranchUtils.getOrCreateBranch(out, branchName, client, project, false);
            if (Objects.isNull(branch)) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.branch_required_string_project"));
            }
            if (isPluralString) {
                AddSourcePluralStringStringsBasedRequest request = RequestBuilder.addPluralStringStringsBased(
                    this.text, this.identifier, this.maxLength, this.context, branch.getId(), this.hidden, labelIds, one, two, few, many, zero);
                client.addSourcePluralStringStringsBased(request);
            } else {
                AddSourceStringStringsBasedRequest request = RequestBuilder.addStringStringsBased(this.text, this.identifier, this.maxLength, this.context, branch.getId(), this.hidden, labelIds);
                client.addSourceStringStringsBased(request);
            }
            out.println(OK.withIcon(RESOURCE_BUNDLE.getString("message.source_string_uploaded")));
        } else {
            if (files == null || files.isEmpty()) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.file_required"));
            }
            Map<String, FileInfo> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFileInfos());
            boolean containsError = false;
            for (String file : files) {
                if (!paths.containsKey(file)) {
                    if (files.size() > 1) {
                        containsError = true;
                        out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), file)));
                        continue;
                    } else {
                        throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), file));
                    }
                }
                Long fileId = paths.get(file).getId();

                if (isPluralString) {
                    AddSourcePluralStringRequest request = RequestBuilder.addPluralString(
                        this.text, this.identifier, this.maxLength, this.context, fileId, this.hidden, labelIds, one, two, few, many, zero);
                    client.addSourcePluralString(request);
                } else {
                    AddSourceStringRequest request =
                        RequestBuilder.addString(this.text, this.identifier, this.maxLength, this.context, fileId, this.hidden, labelIds);
                    client.addSourceString(request);
                }
                out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.source_string_for_file_uploaded"), file)));
            }
            if (containsError) {
                throw new RuntimeException();
            }
        }
    }

    private List<Long> prepareLabelIds(ProjectClient client) {
        Map<String, Long> labels = client.listLabels().stream()
            .collect(Collectors.toMap(Label::getTitle, Label::getId));
        labelNames.stream()
            .distinct()
            .forEach(labelName -> labels.computeIfAbsent(labelName, (title) -> client.addLabel(RequestBuilder.addLabel(title)).getId()));
        return labelNames.stream()
            .map(labels::get)
            .collect(Collectors.toList());
    }
}
