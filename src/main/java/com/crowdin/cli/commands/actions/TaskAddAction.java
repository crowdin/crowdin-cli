package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientTask;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;

import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.properties.ProjectProperties;

import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.tasks.model.*;

import lombok.AllArgsConstructor;

import java.util.*;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;
import static java.util.Objects.nonNull;

@AllArgsConstructor
class TaskAddAction implements NewAction<ProjectProperties, ClientTask> {

    private boolean noProgress;

    private String title;

    private Integer type;

    private String language;

    private List<String> files;

    private String branch;

    private Long workflowStep;

    private String description;

    private boolean skipAssignedStrings;

    private boolean skipUntranslatedStrings;

    private boolean includePreTranslatedStringsOnly;

    private List<Long> labels;

    private ProjectClient projectClient;

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientTask client) {
        boolean isOrganization = PropertiesBeanUtils.isOrganization(pb.getBaseUrl());
        Task task;
        AddTaskRequest addTaskRequest;
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, false, () -> this.projectClient.downloadFullProject(this.branch));

        List<Long> fileIds = new ArrayList<>();
        Map<String, FileInfo> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFileInfos());
        for (String file : files) {
            final String path = Utils.normalizePath(Utils.noSepAtStart(file));
            if (paths.containsKey(path)) {
                fileIds.add(paths.get(path).getId());
            } else {
                out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), path)));
            }
        }
        if (fileIds.isEmpty()) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.task.no_valid_file")));
        }

        if (isOrganization) {
            addTaskRequest = new CreateTaskEnterpriseRequest();
            Optional.ofNullable(title).ifPresent(value -> ((CreateTaskEnterpriseRequest) addTaskRequest).setTitle(value));
            Optional.ofNullable(language).ifPresent(value -> ((CreateTaskEnterpriseRequest) addTaskRequest).setLanguageId(value));
            Optional.ofNullable(fileIds).ifPresent(value -> ((CreateTaskEnterpriseRequest) addTaskRequest).setFileIds(value));
            Optional.ofNullable(description).ifPresent(value -> ((CreateTaskEnterpriseRequest) addTaskRequest).setDescription(value));
            Optional.ofNullable(skipAssignedStrings).ifPresent(value -> ((CreateTaskEnterpriseRequest) addTaskRequest).setSkipAssignedStrings(value));
            Optional.ofNullable(includePreTranslatedStringsOnly).ifPresent(value -> ((CreateTaskEnterpriseRequest) addTaskRequest).setIncludePreTranslatedStringsOnly(value));
            Optional.ofNullable(labels).ifPresent(value -> ((CreateTaskEnterpriseRequest) addTaskRequest).setLabelIds(value));
            Optional.ofNullable(workflowStep).ifPresent(value -> ((CreateTaskEnterpriseRequest) addTaskRequest).setWorkflowStepId(value));
        } else {
            addTaskRequest = new CreateTaskRequest();
            Optional.ofNullable(title).ifPresent(value -> ((CreateTaskRequest) addTaskRequest).setTitle(value));
            Optional.ofNullable(type).ifPresent(value -> ((CreateTaskRequest) addTaskRequest).setType(Type.from(String.valueOf(value))));
            Optional.ofNullable(language).ifPresent(value -> ((CreateTaskRequest) addTaskRequest).setLanguageId(value));
            Optional.ofNullable(fileIds).ifPresent(value -> ((CreateTaskRequest) addTaskRequest).setFileIds(value));
            Optional.ofNullable(description).ifPresent(value -> ((CreateTaskRequest) addTaskRequest).setDescription(value));
            Optional.ofNullable(skipAssignedStrings).ifPresent(value -> ((CreateTaskRequest) addTaskRequest).setSkipAssignedStrings(value));
            Optional.ofNullable(skipUntranslatedStrings).ifPresent(value -> ((CreateTaskRequest) addTaskRequest).setSkipUntranslatedStrings(value));
            Optional.ofNullable(includePreTranslatedStringsOnly).ifPresent(value -> ((CreateTaskRequest) addTaskRequest).setIncludePreTranslatedStringsOnly(value));
            Optional.ofNullable(labels).ifPresent(value -> ((CreateTaskRequest) addTaskRequest).setLabelIds(value));
        }

        try {
            task = client.addTask(addTaskRequest);
            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.task.added"), task.getTitle())));
        } catch (Exception e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.task_is_not_added"), addTaskRequest), e);
        }
    }

    private boolean isConvertibleToLong(String str) {
        try {
            Long.parseLong(str);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
