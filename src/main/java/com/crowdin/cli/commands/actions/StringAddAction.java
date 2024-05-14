package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.BranchUtils;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.sourcestrings.model.*;
import lombok.Data;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
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
    private final boolean plainView;

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, this.plainView, client::downloadFullProject);
        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);
        boolean isPluralString = one != null || two != null || few != null || many != null || zero != null;

        List<Long> labelIds = (labelNames != null && !labelNames.isEmpty()) ? this.prepareLabelIds(client) : null;

        if (isStringsBasedProject) {
            if (files != null && !files.isEmpty()) {
                throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("message.no_file_string_project"));
            }
            Branch branch = BranchUtils.getOrCreateBranch(out, branchName, client, project, plainView);
            if (Objects.isNull(branch)) {
                throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.branch_required_string_project"));
            }
            SourceString ss;
            if (isPluralString) {
                AddSourcePluralStringStringsBasedRequest request = RequestBuilder.addPluralStringStringsBased(
                        this.text, this.identifier, this.maxLength, this.context, branch.getId(), this.hidden, labelIds, one, two, few, many, zero);
                ss = client.addSourcePluralStringStringsBased(request);
            } else {
                AddSourceStringStringsBasedRequest request = RequestBuilder.addStringStringsBased(this.text, this.identifier, this.maxLength, this.context, branch.getId(), this.hidden, labelIds);
                ss = client.addSourceStringStringsBased(request);
            }

            printResult(out, ss);
            return;
        }

        if (files == null || files.isEmpty()) {
            throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.file_required"));
        }

        Optional<Branch> branch = Optional.ofNullable(branchName).flatMap(project::findBranchByName);

        if (!branch.isPresent() && branchName != null) {
            throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("message.branch_does_not_exist"), branchName));
        }

        List<FileInfo> fileInfos = project
                .getFileInfos()
                .stream().filter(f -> !branch.isPresent() || branch.get().getId().equals(f.getBranchId()))
                .collect(Collectors.toList());
        Map<String, FileInfo> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), fileInfos);
        boolean containsError = false;

        for (String file : files) {
            if (!paths.containsKey(file)) {
                if (files.size() > 1) {
                    containsError = true;
                    if (!plainView) {
                        out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), file)));
                    }
                    continue;
                } else {
                    throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), file));
                }
            }
            Long fileId = paths.get(file).getId();

            SourceString ss;
            if (isPluralString) {
                AddSourcePluralStringRequest request = RequestBuilder.addPluralString(
                        this.text, this.identifier, this.maxLength, this.context, fileId, this.hidden, labelIds, one, two, few, many, zero);
                ss = client.addSourcePluralString(request);
            } else {
                AddSourceStringRequest request =
                        RequestBuilder.addString(this.text, this.identifier, this.maxLength, this.context, fileId, this.hidden, labelIds);
                ss = client.addSourceString(request);
            }
            printResult(out, ss);
        }
        if (containsError) {
            throw new RuntimeException();
        }
    }

    private void printResult(Outputter out, SourceString ss) {
        if (!plainView) {
            if (ss.getIdentifier() == null) {
                out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.source_string_list_text_short"), ss.getId(), this.text)));
            } else {
                out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.source_string_list_text"), ss.getId(), ss.getIdentifier(), this.text)));
            }
        } else {
            out.println(ss.getId().toString());
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
