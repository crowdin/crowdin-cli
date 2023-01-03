package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientTask;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;

import com.crowdin.cli.properties.ProjectProperties;

import com.crowdin.client.tasks.model.CrowdinTaskCreateFormRequest;
import com.crowdin.client.tasks.model.Task;

import lombok.AllArgsConstructor;

import java.util.List;
import java.util.Optional;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@AllArgsConstructor
class TaskAddAction implements NewAction<ProjectProperties, ClientTask> {

    private String title;

    private Integer type;

    private String language;

    private List<Long> fileId;

    private String workflowStep;

    private String description;

    private boolean splitFiles;

    private boolean skipAssignedStrings;

    private boolean skipUntranslatedStrings;

    private String label;

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientTask client) {
        Task task;
        CrowdinTaskCreateFormRequest addTaskRequest = new CrowdinTaskCreateFormRequest();
        Optional.ofNullable(title).ifPresent(addTaskRequest::setTitle);
        Optional.ofNullable(type).ifPresent(addTaskRequest::setType);
        Optional.ofNullable(language).ifPresent(addTaskRequest::setLanguageId);
        Optional.ofNullable(fileId).ifPresent(addTaskRequest::setFileIds);
        // TODO: implement
        //Optional.ofNullable(workflowStep).ifPresent(addTaskRequest::set);
        Optional.ofNullable(description).ifPresent(addTaskRequest::setDescription);
        Optional.ofNullable(splitFiles).ifPresent(addTaskRequest::setSplitFiles);
        Optional.ofNullable(skipAssignedStrings).ifPresent(addTaskRequest::setSkipAssignedStrings);
        Optional.ofNullable(skipUntranslatedStrings).ifPresent(addTaskRequest::setSkipUntranslatedStrings);
        // TODO: implement
        //Optional.ofNullable(label).ifPresent(addTaskRequest::setLabelIds);

        try {
            task = client.addTask(addTaskRequest);
        } catch (Exception e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.task_is_not_added"), addTaskRequest), e);
        }
        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.task.added"), task.getTitle())));
    }

}
