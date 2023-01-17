package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class TaskAddSubcommandTest extends PicocliTestUtils {

    private static final String ENTERPRISE_URL = "https://testme.crowdin.com";
    @Test
    public void testTaskAdd() {
        this.execute(CommandNames.TASK, CommandNames.TASK_ADD, "Test Task1", "--language", "es-ES", "--file", "12", "--type", "translate", "--base-url", ENTERPRISE_URL, "--workflow-step", "10");
        verify(actionsMock)
                .taskAdd(any(), any(), any(), any(), anyLong(), any(), anyBoolean(), anyBoolean(), any());
        this.check(true);
    }

    @Test
    public void testTaskAddInvalidOptions() {
        this.executeInvalidParams(CommandNames.TASK, CommandNames.TASK_ADD, "Test Task1", "--language", "unk-Unk", "--file", "stringId", "--type", "unrecognizedType");
    }

}
