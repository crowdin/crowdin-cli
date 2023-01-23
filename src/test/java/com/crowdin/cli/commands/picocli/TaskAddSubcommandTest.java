package com.crowdin.cli.commands.picocli;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.*;
import java.util.stream.Stream;

import static com.crowdin.cli.commands.picocli.GenericCommand.RESOURCE_BUNDLE;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.params.provider.Arguments.arguments;

public class TaskAddSubcommandTest extends PicocliTestUtils {

    @Test
    public void testTaskAddInvalidOptions() {
        this.executeInvalidParams(CommandNames.TASK, CommandNames.TASK_ADD, "Test Task1", "--language", "unk-Unk", "--file", "stringId", "--type", "unrecognizedType");
    }

    @ParameterizedTest
    @MethodSource
    public void testSubCommandCheckValidOptions(boolean isEnterprise, String title, String type, Long workflowStep,  String languageId, List<Long> fileIds) {
        TaskAddSubcommand taskAddSubcommand = new TaskAddSubcommand();
        taskAddSubcommand.title = title;
        taskAddSubcommand.type = type;
        taskAddSubcommand.workflowStep = workflowStep;
        taskAddSubcommand.language = languageId;
        taskAddSubcommand.files = fileIds;
        taskAddSubcommand.description = "";
        taskAddSubcommand.labels = Arrays.asList(10L);
        taskAddSubcommand.skipAssignedStrings = false;
        taskAddSubcommand.skipUntranslatedStrings = false;

        List<String> errors = taskAddSubcommand.checkOptions(isEnterprise);
        assertTrue(errors.isEmpty());
    }

    public static Stream<Arguments> testSubCommandCheckValidOptions() {
        return Stream.of(
            arguments(true, "Enterprise Task 1", "translate", 10L, "es", Arrays.asList(12L)),
            arguments(true, "Enterprise Task 2", null, 10L, "es", Arrays.asList(12L)),
            arguments(false, "Task 1", "translate", 10L, "es", Arrays.asList(12L)),
            arguments(false, "Task 2", "translate", null, "es", Arrays.asList(12L)));
    }

    @ParameterizedTest
    @MethodSource
    public void testSubCommandCheckInvalidOptions(boolean isEnterprise, String title, String type, Long workflowStep, String languageId, List<Long> fileIds, List<String> expErrors) {
        TaskAddSubcommand taskAddSubcommand = new TaskAddSubcommand();
        taskAddSubcommand.title = title;
        taskAddSubcommand.type = type;
        taskAddSubcommand.workflowStep = workflowStep;
        taskAddSubcommand.language = languageId;
        taskAddSubcommand.files = fileIds;
        taskAddSubcommand.description = "";
        taskAddSubcommand.labels = Arrays.asList(10L);
        taskAddSubcommand.skipAssignedStrings = false;
        taskAddSubcommand.skipUntranslatedStrings = false;
        List<String> errors = taskAddSubcommand.checkOptions(isEnterprise);
        assertThat(errors, Matchers.equalTo(expErrors));
    }

    public static Stream<Arguments> testSubCommandCheckInvalidOptions() {
        return Stream.of(
            arguments(false, "Task 1", "", null, "es", Arrays.asList(12L), Arrays.asList(RESOURCE_BUNDLE.getString("error.task.empty_type"))),
            arguments(false, "Task 2", null, null, "es", Arrays.asList(12L), Arrays.asList(RESOURCE_BUNDLE.getString("error.task.empty_type"))),
            arguments(false, "Task 3", "unsupportedType", null, "es", Arrays.asList(12L), Arrays.asList(RESOURCE_BUNDLE.getString("error.task.unsupported.type"))),
            arguments(true, "Enterprise Task 1", null, null, "es", Arrays.asList(12L), Arrays.asList(RESOURCE_BUNDLE.getString("error.task.empty_workflow_step"))),
            arguments(true, null, null, 10L, "es", Arrays.asList(12L), Arrays.asList(RESOURCE_BUNDLE.getString("error.task.empty_title"))),
            arguments(true, "Enterprise Task 2", null, 10L, null, Arrays.asList(12L), Arrays.asList(RESOURCE_BUNDLE.getString("error.task.empty_language"))),
            arguments(false, "Task 4", "translate", null, "es", null, Arrays.asList(RESOURCE_BUNDLE.getString("error.task.empty_fileId")))
        );
    }
}
