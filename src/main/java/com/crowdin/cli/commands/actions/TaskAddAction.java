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
import com.crowdin.client.tasks.model.AddTaskRequest;
import com.crowdin.client.tasks.model.CrowdinTaskCreateFormRequest;
import com.crowdin.client.tasks.model.EnterpriseTaskCreateFormRequest;
import com.crowdin.client.tasks.model.Task;

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
        boolean isIdUsed = false;
        Map<String, FileInfo> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFileInfos());
        for (String file : files) {
            // TODO: Remove backward compatibility with file ids
            if (isConvertibleToLong(file)) {
                isIdUsed = true;
                Long id = Long.parseLong(file);
                boolean isFileExist = paths.values().stream().anyMatch(p -> p.getId().equals(id));
                if (isFileExist) {
                    fileIds.add(id);
                } else {
                    out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("error.file_id_not_exists"), file)));
                }
            } else {
                final String path = Utils.normalizePath(Utils.noSepAtStart(file));
                if (paths.containsKey(path)) {
                    fileIds.add(paths.get(path).getId());
                } else {
                    out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), path)));
                }
            }
        }
        // TODO: Remove backward compatibility with file ids
        if (isIdUsed) {
            out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("message.file_id_deprecated"))));
        }
        if (fileIds.isEmpty()) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.task.no_valid_file")));
        }

        if (isOrganization) {
            addTaskRequest = new EnterpriseTaskCreateFormRequest();
            Optional.ofNullable(title).ifPresent(value -> ((EnterpriseTaskCreateFormRequest) addTaskRequest).setTitle(value));
            Optional.ofNullable(language).ifPresent(value -> ((EnterpriseTaskCreateFormRequest) addTaskRequest).setLanguageId(value));
            Optional.ofNullable(fileIds).ifPresent(value -> ((EnterpriseTaskCreateFormRequest) addTaskRequest).setFileIds(value));
            Optional.ofNullable(description).ifPresent(value -> ((EnterpriseTaskCreateFormRequest) addTaskRequest).setDescription(value));
            Optional.ofNullable(skipAssignedStrings).ifPresent(value -> ((EnterpriseTaskCreateFormRequest) addTaskRequest).setSkipAssignedStrings(value));
            Optional.ofNullable(includePreTranslatedStringsOnly).ifPresent(value -> ((EnterpriseTaskCreateFormRequest) addTaskRequest).setIncludePreTranslatedStringsOnly(value));
            Optional.ofNullable(labels).ifPresent(value -> ((EnterpriseTaskCreateFormRequest) addTaskRequest).setLabelIds(value));
            Optional.ofNullable(workflowStep).ifPresent(value -> ((EnterpriseTaskCreateFormRequest) addTaskRequest).setWorkflowStepId(value));
        } else {
            addTaskRequest = new CrowdinTaskCreateFormRequest();
            Optional.ofNullable(title).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setTitle(value));
            Optional.ofNullable(type).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setType(value));
            Optional.ofNullable(language).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setLanguageId(value));
            Optional.ofNullable(fileIds).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setFileIds(value));
            Optional.ofNullable(description).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setDescription(value));
            Optional.ofNullable(skipAssignedStrings).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setSkipAssignedStrings(value));
            Optional.ofNullable(skipUntranslatedStrings).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setSkipUntranslatedStrings(value));
            Optional.ofNullable(includePreTranslatedStringsOnly).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setIncludePreTranslatedStringsOnly(value));
            Optional.ofNullable(labels).ifPresent(value -> ((CrowdinTaskCreateFormRequest) addTaskRequest).setLabelIds(value));
        }

        try {
            task = client.addTask(addTaskRequest);
        } catch (Exception e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.task_is_not_added"), addTaskRequest), e);
        }
        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.task.added"), task.getTitle())));
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
