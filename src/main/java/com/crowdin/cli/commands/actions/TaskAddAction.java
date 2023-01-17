package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientTask;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;

import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.properties.ProjectProperties;

import com.crowdin.client.tasks.model.AddTaskRequest;
import com.crowdin.client.tasks.model.CrowdinTaskCreateFormRequest;
import com.crowdin.client.tasks.model.EnterpriseTaskCreateFormRequest;
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

    private Long workflowStep;

    private String description;

    private boolean skipAssignedStrings;

    private boolean skipUntranslatedStrings;

    private List<Long> labels;

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientTask client) {
        boolean isOrganization = PropertiesBeanUtils.isOrganization(pb.getBaseUrl());
        Task task;
        AddTaskRequest addTaskRequest;
        if (isOrganization) {
            addTaskRequest = new EnterpriseTaskCreateFormRequest();
            Optional.ofNullable(title).ifPresent(value -> ((EnterpriseTaskCreateFormRequest) addTaskRequest).setTitle(value));
            Optional.ofNullable(language).ifPresent(value -> ((EnterpriseTaskCreateFormRequest) addTaskRequest).setLanguageId(value));
            Optional.ofNullable(fileId).ifPresent(value -> ((EnterpriseTaskCreateFormRequest) addTaskRequest).setFileIds(value));
            Optional.ofNullable(description).ifPresent(value -> ((EnterpriseTaskCreateFormRequest) addTaskRequest).setDescription(value));
            Optional.ofNullable(skipAssignedStrings).ifPresent(value -> ((EnterpriseTaskCreateFormRequest) addTaskRequest).setSkipAssignedStrings(value));
            Optional.ofNullable(labels).ifPresent(value -> ((EnterpriseTaskCreateFormRequest) addTaskRequest).setLabelIds(value));
            Optional.ofNullable(workflowStep).ifPresent(value -> ((EnterpriseTaskCreateFormRequest) addTaskRequest).setWorkflowStepId(value));
        } else {
            addTaskRequest = new CrowdinTaskCreateFormRequest();
            Optional.ofNullable(title).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setTitle(value));
            Optional.ofNullable(type).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setType(value));
            Optional.ofNullable(language).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setLanguageId(value));
            Optional.ofNullable(fileId).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setFileIds(value));
            Optional.ofNullable(description).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setDescription(value));
            Optional.ofNullable(skipAssignedStrings).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setSkipAssignedStrings(value));
            Optional.ofNullable(skipUntranslatedStrings).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setSkipUntranslatedStrings(value));
            Optional.ofNullable(labels).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setLabelIds(value));
        }

        try {
            task = client.addTask(addTaskRequest);
        } catch (Exception e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.task_is_not_added"), addTaskRequest), e);
        }
        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.task.added"), task.getTitle())));
    }

}
