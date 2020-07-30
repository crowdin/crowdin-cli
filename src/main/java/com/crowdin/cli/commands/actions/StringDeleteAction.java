package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.Project;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcestrings.model.SourceString;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

public class StringDeleteAction implements ClientAction {

    private final boolean noProgress;
    private final List<Long> ids;
    private final List<String> texts;
    private final List<String> identifiers;

    public StringDeleteAction(boolean noProgress, List<Long> ids, List<String> texts, List<String> identifiers) {
        this.noProgress = noProgress;
        this.ids = ids;
        this.texts = texts;
        this.identifiers = identifiers;
    }

    @Override
    public void act(Outputter out, PropertiesBean pb, Client client) {
        Project project;
        try {
            ConsoleSpinner.start(out, RESOURCE_BUNDLE.getString("message.spinner.fetching_project_info"), this.noProgress);
            project = client.downloadFullProject();
            ConsoleSpinner.stop(OK);
        } catch (Exception e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.collect_project_info"), e);
        }

        Map<Long, String> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFiles())
            .entrySet()
            .stream()
            .collect(Collectors.toMap((entry) -> entry.getValue().getId(), Map.Entry::getKey));

        List<SourceString> sourceStrings = client.listSourceString(null, null)
            .stream()
            .filter(sourceString -> (ids != null && ids.contains(sourceString.getId()))
                || (texts != null && sourceString.getText() instanceof String && texts.contains(sourceString.getText()))
                || (identifiers != null && identifiers.contains(sourceString.getIdentifier())))
            .collect(Collectors.toList());

        for (SourceString sourceString : sourceStrings) {
            client.deleteSourceString(sourceString.getId());
            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.source_string_deleted"),
                sourceString.getText(), sourceString.getId(), paths.get(sourceString.getFileId()))));
        }

        if (sourceStrings.isEmpty()) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("error.source_string_not_found")));
        }
    }
}
