package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientTask;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.tasks.model.Status;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
    name = CommandNames.TASK_LIST,
    sortOptions = false
)
class TaskListSubcommand extends ActCommandTask {

    @CommandLine.Option(names = {"--status"}, paramLabel = "...", descriptionKey = "crowdin.task.list.status", order = -2)
    private String status;

    @CommandLine.Option(names = {"--assignee-id"}, paramLabel = "...", descriptionKey = "crowdin.task.list.assignee-id", order = -2)
    private Long assigneeId;

    @Override
    protected NewAction<ProjectProperties, ClientTask> getAction(Actions actions) {
        return actions.taskList(this.plainView, this.isVerbose, status, assigneeId);
    }

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        try {
            if (status != null) {
                Status.valueOf(status.toUpperCase());
            }
        } catch (IllegalArgumentException e) {
            errors.add(String.format(RESOURCE_BUNDLE.getString("error.task.list.unsupported_status"), status));
        }
        return errors;
    }
}
