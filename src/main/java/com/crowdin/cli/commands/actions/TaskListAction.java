package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientTask;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.tasks.model.Status;
import com.crowdin.client.tasks.model.Task;

import java.util.List;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.*;

class TaskListAction implements NewAction<ProjectProperties, ClientTask> {

    private final boolean plainView;
    private final boolean isVerbose;

    private final String status;

    private final Long assigneeId;

    public TaskListAction(boolean plainView, boolean isVerbose, String status, Long assigneeId) {
        this.plainView = plainView;
        this.isVerbose = isVerbose;
        this.status = status;
        this.assigneeId = assigneeId;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientTask client) {
        Status sts = status == null ? null : Status.valueOf(status.toUpperCase());
        List<Task> tasks = client.listTask(sts);
        if (assigneeId != null) {
            tasks = tasks.stream()
                    .filter(task -> task.getAssignees().stream()
                            .anyMatch(assignee -> assignee.getId().equals(assigneeId)))
                    .collect(Collectors.toList());
        }
        for (Task task : tasks) {
            String okMessage = isVerbose ? "message.task.list.verbose" : "message.task.list";
            String deadline = task.getDeadline() == null ? "NoDueDate" : task.getDeadline().toString();
            if (!plainView) {
                out.println(String.format(RESOURCE_BUNDLE.getString(okMessage), task.getId(),
                            task.getTargetLanguageId(), task.getTitle(), task.getStatus(), task.getWordsCount(), deadline));
            } else {
                out.println(String.format(RESOURCE_BUNDLE.getString(okMessage), task.getId(), task.getTargetLanguageId(), task.getTitle(), task.getStatus(), task.getWordsCount(), deadline));
            }
        }
        if (tasks.isEmpty()) {
            if (!plainView) {
                out.println(OK.withIcon(RESOURCE_BUNDLE.getString("message.task.list_empty")));
            }
        }
    }
}
