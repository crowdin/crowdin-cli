package com.crowdin.cli.client;

import com.crowdin.client.tasks.model.AddTaskRequest;
import com.crowdin.client.tasks.model.Status;
import com.crowdin.client.tasks.model.Task;

import java.util.List;

public class CrowdinClientTask extends CrowdinClientCore implements ClientTask {

    private final com.crowdin.client.Client client;
    private final String projectId;

    public CrowdinClientTask(com.crowdin.client.Client client, String projectId) {
        this.client = client;
        this.projectId = projectId;
    }

    @Override
    public List<Task> listTask(Status status) {
        return executeRequestFullList((limit, offset) -> this.client.getTasksApi()
            .listTasks(Long.valueOf(projectId), limit, offset, status));
    }

    @Override
    public Task addTask(AddTaskRequest taskRequest) {
        return executeRequest(() -> this.client.getTasksApi()
            .addTask(Long.valueOf(projectId), taskRequest)
            .getData());
    }

}
