package com.crowdin.cli.client;

import com.crowdin.client.tasks.model.AddTaskRequest;
import com.crowdin.client.tasks.model.Status;
import com.crowdin.client.tasks.model.Task;

import java.util.List;

public interface ClientTask extends Client {

    List<Task> listTask(Status status);

    Task addTask(AddTaskRequest request);

}
