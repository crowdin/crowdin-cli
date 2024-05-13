package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.core.model.PatchOperation;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.sourcestrings.model.SourceString;

import java.util.*;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.commands.actions.StringListAction.printSourceString;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class StringEditAction implements NewAction<ProjectProperties, ProjectClient> {

    private final Long id;
    private final String identifier;
    private final String newText;
    private final String newContext;
    private final Integer newMaxLength;
    private final List<String> labelNames;
    private final Boolean isHidden;
    private final boolean isVerbose;
    private final boolean noProgress;
    private final boolean plainView;

    public StringEditAction(
            boolean noProgress, boolean isVerbose, Long id, String identifier, String newText, String newContext,
            Integer newMaxLength, List<String> labelNames, Boolean isHidden, boolean plainView
    ) {
        this.id = id;
        this.identifier = identifier;
        this.newText = newText;
        this.newContext = newContext;
        this.newMaxLength = newMaxLength;
        this.labelNames = labelNames;
        this.isHidden = isHidden;
        this.isVerbose = isVerbose;
        this.noProgress = noProgress;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, this.plainView, client::downloadFullProject);
        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);

        Map<Long, String> reversePaths = null;
        if (!isStringsBasedProject) {
            Map<String, FileInfo> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFileInfos());
            reversePaths = paths.entrySet()
                    .stream()
                    .collect(Collectors.toMap((entry) -> entry.getValue().getId(), Map.Entry::getKey));
        }
        Map<Long, String> finalReversePaths = reversePaths;

        List<Long> labelIds = (labelNames != null && !labelNames.isEmpty()) ? this.prepareLabelIds(client) : null;

        List<PatchRequest> requests = new ArrayList<>();
        if (newText != null) {
            PatchRequest request = RequestBuilder.patch(newText, PatchOperation.REPLACE, "/text");
            requests.add(request);
        }
        if (newContext != null) {
            PatchRequest request = RequestBuilder.patch(newContext, PatchOperation.REPLACE, "/context");
            requests.add(request);
        }
        if (newMaxLength != null) {
            PatchRequest request = RequestBuilder.patch(newMaxLength, PatchOperation.REPLACE, "/maxLength");
            requests.add(request);
        }
        if (isHidden != null) {
            PatchRequest request = RequestBuilder.patch(isHidden, PatchOperation.REPLACE, "/isHidden");
            requests.add(request);
        }
        if (identifier != null) {
            PatchRequest request = RequestBuilder.patch(identifier, PatchOperation.REPLACE, "/identifier");
            requests.add(request);
        }
        if (labelIds != null) {
            PatchRequest request = RequestBuilder.patch(labelIds, PatchOperation.REPLACE, "/labelIds");
            requests.add(request);
        }

        SourceString updatedString = client.editSourceString(this.id, requests);
        if (!plainView) {
            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.source_string_updated"), this.id)));
        } else {
            out.println(String.format(RESOURCE_BUNDLE.getString("message.source_string_updated"), this.id));
        }

        Map<Long, String> labelsMap = client.listLabels().stream()
                .collect(Collectors.toMap(Label::getId, Label::getTitle));
        printSourceString(updatedString, labelsMap, out, isStringsBasedProject, finalReversePaths, isVerbose, plainView);
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
