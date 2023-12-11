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

    @CommandLine.Option(names = {"--id"}, paramLabel = "...", order = -2)
    protected Long id;

    @CommandLine.Option(names = {"--identifier"}, paramLabel = "...", order = -2)
    protected String identifier;

    @CommandLine.Option(names = {"--text"}, paramLabel = "...", order = -2)
    protected String newText;

    @CommandLine.Option(names = {"--context"}, paramLabel = "...", order = -2)
    protected String newContext;

    @CommandLine.Option(names = {"--max-length"}, paramLabel = "...", order = -2)
    protected Integer newMaxLength;

    @CommandLine.Option(names = {"--label"}, descriptionKey = "params.label", paramLabel = "...", order = -2)
    protected List<String> labelNames;

    @CommandLine.Option(names = {"--hidden"}, negatable = true, order = -2)
    protected Boolean newIsHidden;

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (id == null && identifier == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.source_string_id_not_specified"));
        } else if (id != null && identifier != null) {
            errors.add("You can't use both identifiers");
        }
        if (newText == null && newContext == null && newMaxLength == null && newIsHidden == null && (labelNames == null || labelNames.isEmpty())) {
            errors.add(RESOURCE_BUNDLE.getString("error.source_string_no_edit"));
        }
        return errors;
    }

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.stringEdit(noProgress, id, identifier, newText, newContext, newMaxLength, labelNames, newIsHidden);
    }
}
