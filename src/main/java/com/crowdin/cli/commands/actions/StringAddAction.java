package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.File;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.sourcestrings.model.AddSourceStringRequest;

import java.util.List;
import java.util.Map;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

class StringAddAction implements ClientAction {

    private final boolean noProgress;
    private final String text;
    private final String identifier;
    private final Integer maxLength;
    private final String context;
    private final List<String> files;
    private final Boolean hidden;

    public StringAddAction(
        boolean noProgress, String text, String identifier, Integer maxLength, String context, List<String> files, Boolean hidden
    ) {
        this.noProgress = noProgress;
        this.text = text;
        this.identifier = identifier;
        this.maxLength = maxLength;
        this.context = context;
        this.files = files;
        this.hidden = hidden;
    }

    @Override
    public void act(Outputter out, PropertiesBean pb, Client client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, false, client::downloadFullProject);

        if (files == null || files.isEmpty()) {
            AddSourceStringRequest request = RequestBuilder.addString(this.text, this.identifier, this.maxLength, this.context, null, this.hidden);
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
                    RequestBuilder.addString(this.text, this.identifier, this.maxLength, this.context, fileId, this.hidden);
                client.addSourceString(request);
                out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.source_string_for_file_uploaded"), file)));
            }
            if (containsError) {
                throw new RuntimeException();
            }
        }

    }
}
