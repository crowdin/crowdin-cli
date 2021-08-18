package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.sourcestrings.model.AddSourceStringRequest;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

class StringAddAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private final boolean noProgress;
    private final String text;
    private final String identifier;
    private final Integer maxLength;
    private final String context;
    private final List<String> files;
    private final List<String> labelNames;
    private final Boolean hidden;

    public StringAddAction(
        boolean noProgress, String text, String identifier, Integer maxLength, String context, List<String> files, List<String> labelNames, Boolean hidden
    ) {
        this.noProgress = noProgress;
        this.text = text;
        this.identifier = identifier;
        this.maxLength = maxLength;
        this.context = context;
        this.files = files;
        this.labelNames = labelNames;
        this.hidden = hidden;
    }

    @Override
    public void act(Outputter out, PropertiesWithFiles pb, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, false, client::downloadFullProject);

        List<Long> labelIds = (labelNames != null && !labelNames.isEmpty()) ? this.prepareLabelIds(client) : null;

        if (files == null || files.isEmpty()) {
            AddSourceStringRequest request = RequestBuilder.addString(this.text, this.identifier, this.maxLength, this.context, null, this.hidden, labelIds);
            client.addSourceString(request);
            out.println(OK.withIcon(RESOURCE_BUNDLE.getString("message.source_string_uploaded")));
        } else {
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

                AddSourceStringRequest request =
                    RequestBuilder.addString(this.text, this.identifier, this.maxLength, this.context, fileId, this.hidden, labelIds);
                client.addSourceString(request);
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
