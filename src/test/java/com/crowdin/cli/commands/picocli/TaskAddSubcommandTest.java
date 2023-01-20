package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.ProjectPropertiesBuilder;
import com.crowdin.cli.properties.PropertiesBuilders;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class TaskAddSubcommandTest extends PicocliTestUtils {

    private static final String ENTERPRISE_URL = "https://testme.crowdin.com";
    @Test
    public void testTaskAdd() {
        System.out.println("running execute command");
        this.execute(CommandNames.TASK, CommandNames.TASK_ADD, "\"Test Task1\"", "--language", "es", "--file", "12", "--base-url", ENTERPRISE_URL, "--workflow-step", "10");
        System.out.println("running verify command");
        verify(actionsMock)
                .taskAdd(any(), any(), any(), any(), anyLong(), any(), anyBoolean(), anyBoolean(), any());
        System.out.println("running check command");
        this.check(true);
    }

    @Test
    public void testTaskAddInvalidOptions() {
        this.executeInvalidParams(CommandNames.TASK, CommandNames.TASK_ADD, "Test Task1", "--language", "unk-Unk", "--file", "stringId", "--type", "unrecognizedType");
    }

}
