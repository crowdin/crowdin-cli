package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientTask;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.properties.ProjectProperties;

import com.crowdin.cli.utils.Utils;
import org.apache.commons.lang3.LocaleUtils;
import org.apache.logging.log4j.util.Strings;
import picocli.CommandLine;

import java.util.*;

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

    @CommandLine.Option(names = {"--file"}, descriptionKey = "crowdin.task.add.file-id", split = ",")
    private List<Long> files;

    @CommandLine.Option(names = {"--workflow-step"}, paramLabel = "...", descriptionKey = "crowdin.task.add.workflow-step")
    private Long workflowStep;

    @CommandLine.Option(names = {"--description"}, paramLabel = "...", descriptionKey = "crowdin.task.add.description")
    private String description;

    @CommandLine.Option(names = {"--skip-assigned-strings"}, paramLabel = "...", negatable = true, descriptionKey = "crowdin.task.add.skip-assigned-strings")
    private boolean skipAssignedStrings;

    @CommandLine.Option(names = {"--skip-untranslated-strings"}, paramLabel = "...", negatable = true, descriptionKey = "crowdin.task.add.skip-untranslated-strings")
    private boolean skipUntranslatedStrings;

    @CommandLine.Option(names = {"--label"}, paramLabel = "...", descriptionKey = "crowdin.task.add.label")
    private List<Long> labels;

    @Override
    protected NewAction<ProjectProperties, ClientTask> getAction(Actions actions) {
        int intType = TRANSLATE_TASK_TYPE.equalsIgnoreCase(type) ? 0 : 1;
        return actions.taskAdd(title, intType, language, files, workflowStep, description, skipAssignedStrings, skipUntranslatedStrings, labels);
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (Strings.isEmpty(type)) {
            errors.add(RESOURCE_BUNDLE.getString("error.task.empty_type"));
        }
        if (Strings.isNotEmpty(type) && !(TRANSLATE_TASK_TYPE.equalsIgnoreCase(type) || PROOFREAD_TASK_TYPE.equalsIgnoreCase(type))) {
            errors.add(RESOURCE_BUNDLE.getString("error.task.unsupported.type"));
        }
        if(Strings.isEmpty(title)){
            errors.add(RESOURCE_BUNDLE.getString("error.task.empty_title"));
        }
        try {
            if(Strings.isEmpty(language)){
                errors.add(RESOURCE_BUNDLE.getString("error.task.empty_language"));
            }
            else if (!LocaleUtils.isAvailableLocale(new Locale.Builder().setLanguageTag(language).build())) {
                throw new IllformedLocaleException();
            }
        } catch (IllformedLocaleException e) {
            errors.add(RESOURCE_BUNDLE.getString("error.task.illegal_language"));
        }
        if (files == null || files.isEmpty()) {
            errors.add(RESOURCE_BUNDLE.getString("error.task.empty_fileId"));
        }
        if(PropertiesBeanUtils.isOrganization(Utils.getBaseUrl())){
            if (workflowStep == null) {
                errors.add(RESOURCE_BUNDLE.getString("error.task.empty_workflow_step"));
            }
        }
        return errors;
    }

}
