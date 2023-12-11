package com.crowdin.cli.commands.picocli;

import com.crowdin.client.tasks.model.Status;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

public class TaskListSubcommandTest extends PicocliTestUtils {

    @Test
    public void testTaskList() {
        this.execute(CommandNames.TASK, CommandNames.TASK_LIST);
        verify(actionsMock)
            .taskList(anyBoolean(), anyBoolean(), any(), any());
        this.check(true);
    }
}
