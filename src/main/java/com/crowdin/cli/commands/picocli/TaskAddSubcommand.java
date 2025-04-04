package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientTask;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.properties.ProjectProperties;

import org.apache.logging.log4j.util.Strings;
import picocli.CommandLine;

import java.util.*;

@CommandLine.Command(
    name = CommandNames.ADD,
    sortOptions = false
)
class TaskAddSubcommand extends ActCommandTask {

    public static final String TRANSLATE_TASK_TYPE = "translate";
    public static final String PROOFREAD_TASK_TYPE = "proofread";

    @CommandLine.Parameters(descriptionKey = "crowdin.task.add.title")
    protected String title;

    @CommandLine.Option(names = {"--type"}, paramLabel = "...", descriptionKey = "crowdin.task.add.type", order = -2)
    protected String type;

    @CommandLine.Option(names = {"--language"}, paramLabel = "...", descriptionKey = "crowdin.task.add.language", order = -2)
    protected String language;

    @CommandLine.Option(names = {"--file"}, paramLabel = "...", descriptionKey = "crowdin.task.add.file", order = -2)
    protected List<String> files;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", descriptionKey = "branch", order = -2)
    protected String branch;

    @CommandLine.Option(names = {"--workflow-step"}, paramLabel = "...", descriptionKey = "crowdin.task.add.workflow-step", order = -2)
    protected Long workflowStep;

    @CommandLine.Option(names = {"--description"}, paramLabel = "...", descriptionKey = "crowdin.task.add.description", order = -2)
    protected String description;

    @CommandLine.Option(names = {"--skip-assigned-strings"}, paramLabel = "...", negatable = true, descriptionKey = "crowdin.task.add.skip-assigned-strings", order = -2)
    protected Boolean skipAssignedStrings;

    @CommandLine.Option(names = {"--include-pre-translated-strings-only"}, paramLabel = "...", negatable = true, descriptionKey = "crowdin.task.add.include-pre-translated-strings-only", order = -2)
    protected Boolean includePreTranslatedStringsOnly;

    @CommandLine.Option(names = {"--label"}, paramLabel = "...", descriptionKey = "crowdin.task.add.label", order = -2)
    protected List<Long> labels;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ClientTask> getAction(Actions actions) {
        int intType = TRANSLATE_TASK_TYPE.equalsIgnoreCase(type) ? 0 : 1;

        return actions.taskAdd(
            noProgress,
            title,
            intType,
            language,
            files,
            branch,
            workflowStep,
            description,
            skipAssignedStrings,
            includePreTranslatedStringsOnly,
            labels,
            plainView
        );
    }

    @Override
    protected List<String> checkOptions(ProjectProperties properties) {
        String url = properties.getBaseUrl();
        boolean isEnterprise = PropertiesBeanUtils.isOrganization(url);
        return checkOptions(isEnterprise);
    }

    protected List<String> checkOptions(boolean isEnterprise) {
        List<String> errors = new ArrayList<>();
        if (!isEnterprise) {
            if (Strings.isEmpty(type)) {
                errors.add(RESOURCE_BUNDLE.getString("error.task.empty_type"));
            }

            if (Strings.isNotEmpty(type) && !(TRANSLATE_TASK_TYPE.equalsIgnoreCase(type) || PROOFREAD_TASK_TYPE.equalsIgnoreCase(type))) {
                errors.add(RESOURCE_BUNDLE.getString("error.task.unsupported.type"));
            }

        } else {
            if (workflowStep == null) {
                errors.add(RESOURCE_BUNDLE.getString("error.task.empty_workflow_step"));
            }
        }

        if (Strings.isEmpty(title)) {
            errors.add(RESOURCE_BUNDLE.getString("error.task.empty_title"));
        }

        if (Strings.isEmpty(language)) {
            errors.add(RESOURCE_BUNDLE.getString("error.task.empty_language"));
        }

        if (files == null || files.isEmpty()) {
            errors.add(RESOURCE_BUNDLE.getString("error.task.empty_file"));
        }

        if (TRANSLATE_TASK_TYPE.equalsIgnoreCase(type) && (includePreTranslatedStringsOnly != null && includePreTranslatedStringsOnly)) {
            errors.add(RESOURCE_BUNDLE.getString("error.task.translate_type_include_pre_translated_strings"));
        }

        return errors;
    }
}
