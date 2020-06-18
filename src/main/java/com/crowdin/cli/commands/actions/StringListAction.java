package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.Project;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.File;
import com.crowdin.client.sourcestrings.model.SourceString;
import org.apache.commons.lang3.StringUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

public class StringListAction implements Action {

    private final boolean noProgress;
    private final boolean isVerbose;
    private final String file;
    private final String filter;

    public StringListAction(boolean noProgress, boolean isVerbose, String file, String filter) {
        this.noProgress = noProgress;
        this.isVerbose = isVerbose;
        this.file = file;
        this.filter = filter;
    }

    @Override
    public void act(PropertiesBean pb, Client client) {
        Project project;
        try {
            ConsoleSpinner.start(RESOURCE_BUNDLE.getString("message.spinner.fetching_project_info"), this.noProgress);
            project = client.downloadFullProject();
            ConsoleSpinner.stop(OK);
        } catch (Exception e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.collect_project_info"), e);
        }

        Map<String, File> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFiles());
        Map<Long, String> reversePaths = paths.entrySet()
            .stream()
            .collect(Collectors.toMap((entry) -> entry.getValue().getId(), Map.Entry::getKey));

        List<SourceString> sourceStrings;
        if (StringUtils.isEmpty(file)) {
            sourceStrings = client.listSourceString(null, filter);
        } else {
            if (paths.containsKey(file)) {
                sourceStrings = client.listSourceString(paths.get(file).getId(), filter);
            } else {
                throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), file));
            }
        }
        Map<Long, List<SourceString>> sourceStringsSortedByFileId = new HashMap<>();
        for (SourceString sourceString : sourceStrings) {
            sourceStringsSortedByFileId.putIfAbsent(sourceString.getFileId(), new ArrayList<>());
            sourceStringsSortedByFileId.get(sourceString.getFileId()).add(sourceString);
        }
        for (Long fileId : sourceStringsSortedByFileId.keySet()) {
            System.out.println(String.format(RESOURCE_BUNDLE.getString("message.source_string_file"), reversePaths.get(fileId)));
            for (SourceString sourceString : sourceStringsSortedByFileId.get(fileId)) {
                System.out.println(String.format(RESOURCE_BUNDLE.getString("message.source_string_list_text"), sourceString.getText()));
                if (StringUtils.isNotEmpty(sourceString.getContext())) {
                    System.out.println(String.format(RESOURCE_BUNDLE.getString("message.source_string_list_context"), StringUtils.trim(sourceString.getContext()).replaceAll("\n", "\n\t ")));
                }
                System.out.println(String.format(RESOURCE_BUNDLE.getString("message.source_string_list_id"), sourceString.getId()));
                if (sourceString.getMaxLength() > 0) {
                    System.out.println(String.format(RESOURCE_BUNDLE.getString("message.source_string_list_max_length"), sourceString.getMaxLength()));
                }
                if (this.isVerbose) {
                    System.out.println(String.format(RESOURCE_BUNDLE.getString("message.source_string_list_identifier"), sourceString.getIdentifier()));
                    System.out.println(String.format(RESOURCE_BUNDLE.getString("message.source_string_list_type"), sourceString.getType()));
                }
            }
        }
    }
}
