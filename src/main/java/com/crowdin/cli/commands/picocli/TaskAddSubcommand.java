package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientTask;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;

import org.apache.logging.log4j.util.Strings;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
        name = CommandNames.TASK_ADD
)
class TaskAddSubcommand extends ActCommandTask {

    public static final String TRANSLATE_TASK_TYPE = "translate";
    public static final String PROOFREAD_TASK_TYPE = "proofread";
    @CommandLine.Parameters(descriptionKey = "crowdin.task.add.title")
    private String title;

    @CommandLine.Option(names = {"--type"}, paramLabel = "...", descriptionKey = "crowdin.task.add.type")
    private String type;

    @CommandLine.Option(names = {"--language"}, paramLabel = "...", descriptionKey = "crowdin.task.add.language")
    private String language;

    @CommandLine.Option(names = {"--file-id"}, paramLabel = "...", descriptionKey = "crowdin.task.add.file-id", split = ",")
    private List<Long> fileId;

    @CommandLine.Option(names = {"--workflow-step"}, paramLabel = "...", descriptionKey = "crowdin.task.add.workflow-step")
    private String workflowStep;

    @CommandLine.Option(names = {"--description"}, paramLabel = "...", descriptionKey = "crowdin.task.add.description")
    private String description;

    @CommandLine.Option(names = {"--split-files"}, paramLabel = "...", negatable = true, descriptionKey = "crowdin.task.add.split-files")
    private boolean splitFiles;

    @CommandLine.Option(names = {"--skip-assigned-strings"}, paramLabel = "...", negatable = true, descriptionKey = "crowdin.task.add.skip-assigned-strings")
    private boolean skipAssignedStrings;

    @CommandLine.Option(names = {"--skip-untranslated-strings"}, paramLabel = "...", negatable = true, descriptionKey = "crowdin.task.add.skip-untranslated-strings")
    private boolean skipUntranslatedStrings;

    @CommandLine.Option(names = {"--label"}, paramLabel = "...", descriptionKey = "crowdin.task.add.label")
    private String label;

    @Override
    protected NewAction<ProjectProperties, ClientTask> getAction(Actions actions) {
        int intType = "translate".equalsIgnoreCase(type) ? 0 : 1;
        return actions.taskAdd(title, intType, language, fileId, workflowStep, description, splitFiles, skipAssignedStrings, skipUntranslatedStrings, label);
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (Strings.isEmpty(type)) {
            errors.add(RESOURCE_BUNDLE.getString("error.task.empty_type"));
        } else if (!(TRANSLATE_TASK_TYPE.equalsIgnoreCase(type) || PROOFREAD_TASK_TYPE.equalsIgnoreCase(type))) {
            errors.add(RESOURCE_BUNDLE.getString("error.task.unsupported.type"));
        }
        return errors;
    }

}
