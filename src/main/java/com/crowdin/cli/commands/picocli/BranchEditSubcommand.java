package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.core.model.Priority;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
        sortOptions = false,
        name = CommandNames.EDIT
)
class BranchEditSubcommand extends ActCommandProject {

    @CommandLine.Parameters(descriptionKey = "crowdin.branch.edit.name")
    protected String name;

    @CommandLine.Option(names = "--name", descriptionKey = "crowdin.branch.edit.new-name", paramLabel = "...", order = -2)
    protected String newName;

    @CommandLine.Option(names = "--title", descriptionKey = "crowdin.branch.edit.title", paramLabel = "...", order = -2)
    protected String title;

    @CommandLine.Option(names = "--priority", descriptionKey = "crowdin.branch.edit.priority", paramLabel = "...", order = -2)
    protected Priority priority;

    @CommandLine.Option(names = "--export-pattern", descriptionKey = "crowdin.branch.edit.export-pattern", paramLabel = "...", order = -2)
    protected String exportPattern;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (newName == null && title == null && priority == null && exportPattern == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.branch_no_edit"));
        }
        return errors;
    }

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.branchEdit(name, newName, title, priority, exportPattern, noProgress, plainView);
    }
}
