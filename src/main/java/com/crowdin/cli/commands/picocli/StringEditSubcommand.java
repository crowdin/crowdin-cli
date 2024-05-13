package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
    name = CommandNames.STRING_EDIT,
    sortOptions = false
)
class StringEditSubcommand extends ActCommandProject {

    @CommandLine.Parameters(descriptionKey = "crowdin.string.edit.id")
    protected Long id;

    @CommandLine.Option(names = {"--identifier"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.string.edit.identifier")
    protected String identifier;

    @CommandLine.Option(names = {"--text"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.string.edit.text")
    protected String newText;

    @CommandLine.Option(names = {"--context"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.string.edit.context")
    protected String newContext;

    @CommandLine.Option(names = {"--max-length"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.string.edit.max-length")
    protected Integer newMaxLength;

    @CommandLine.Option(names = {"--label"}, descriptionKey = "params.label", paramLabel = "...", order = -2)
    protected List<String> labelNames;

    @CommandLine.Option(names = {"--hidden"}, negatable = true, order = -2, descriptionKey = "crowdin.string.edit.hidden")
    protected Boolean newIsHidden;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (newText == null && newContext == null && newMaxLength == null && newIsHidden == null && (labelNames == null || labelNames.isEmpty())) {
            errors.add(RESOURCE_BUNDLE.getString("error.source_string_no_edit"));
        }
        return errors;
    }

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.stringEdit(noProgress, isVerbose, id, identifier, newText, newContext, newMaxLength, labelNames, newIsHidden, plainView);
    }
}
