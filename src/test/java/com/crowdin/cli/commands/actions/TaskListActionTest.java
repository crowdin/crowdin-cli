package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientTask;
import com.crowdin.cli.client.ClientTm;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.*;
import com.crowdin.client.tasks.model.Status;
import com.crowdin.client.tasks.model.Task;
import com.crowdin.client.translationmemory.model.TranslationMemory;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.*;

public class TaskListActionTest {

    List<Task> standardList = Arrays.asList(
        new Task() {{
                setStatus(Status.TODO);
            }},
        new Task() {{
                setStatus(Status.TODO);
            }}
    );
    List<Task> emptyList = Collections.emptyList();

    Outputter out = Outputter.getDefault();
    PropertiesWithFiles pb;

    ClientTask clientMock = mock(ClientTask.class);
    NewAction<ProjectProperties, ClientTask> action;

    @Test
    public void test_standard() {
        when(clientMock.listTask(Status.TODO))
            .thenReturn(standardList);

        action = new TaskListAction(false, false, Status.TODO.toString(), null);
        action.act(out, pb, clientMock);

        verify(clientMock).listTask(Status.TODO);
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_plainView() {
        when(clientMock.listTask(Status.TODO))
            .thenReturn(standardList);

        action = new TaskListAction(true, false, Status.TODO.toString(), null);
        action.act(out, pb, clientMock);

        verify(clientMock).listTask(Status.TODO);
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList() {
        when(clientMock.listTask(Status.TODO))
            .thenReturn(emptyList);

        action = new TaskListAction(false, false, Status.TODO.toString(), null);
        action.act(out, pb, clientMock);

        verify(clientMock).listTask(Status.TODO);
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList_plainView() {
        when(clientMock.listTask(Status.TODO))
            .thenReturn(emptyList);

        action = new TaskListAction(true, false, Status.TODO.toString(), null);
        action.act(out, pb, clientMock);

        verify(clientMock).listTask(Status.TODO);
        verifyNoMoreInteractions(clientMock);
    }
}
