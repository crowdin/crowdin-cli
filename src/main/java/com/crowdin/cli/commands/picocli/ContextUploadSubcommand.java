package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
        name = CommandNames.CONTEXT_UPLOAD,
        sortOptions = false
)
class ContextUploadSubcommand extends ActCommandProject {

    @CommandLine.Option(names = {"--from"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.upload.file")
    protected File file = new File("crowdin-context.jsonl");

    @CommandLine.Option(names = {"--overwrite"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.upload.overwrite")
    protected boolean overwrite;

    @CommandLine.Option(names = {"--dryrun"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.upload.dryrun")
    protected boolean dryrun;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();

        if (!file.exists()) {
            errors.add(String.format(RESOURCE_BUNDLE.getString("error.file_not_found"), file));
        }

        return errors;
    }

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.contextUpload(file, overwrite, this.dryrun, plainView, 100);
    }
}
