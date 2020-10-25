package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.PropertiesWithFiles;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
    name = CommandNames.STRING_EDIT
)
class StringEditSubcommand extends ActCommandWithFiles {

    @CommandLine.Option(names = {"--id"}, paramLabel = "...")
    protected Long id;

    @CommandLine.Option(names = {"--identifier"}, paramLabel = "...", hidden = true)
    protected String identifier;

    @CommandLine.Option(names = {"--text"}, paramLabel = "...")
    protected String newText;

    @CommandLine.Option(names = {"--context"}, paramLabel = "...")
    protected String newContext;

    @CommandLine.Option(names = {"--max-length"}, paramLabel = "...")
    protected Integer newMaxLength;

    @CommandLine.Option(names = {"--hidden"}, negatable = true)
    protected Boolean newIsHidden;

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (id == null && identifier == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.source_string_id_not_specified"));
        } else if (id != null && identifier != null) {
            errors.add("You can't use both identifiers");
        }
        if (newText == null && newContext == null && newMaxLength == null && newIsHidden == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.source_string_no_edit"));
        }
        return errors;
    }

    @Override
    protected NewAction<PropertiesWithFiles, ProjectClient> getAction(Actions actions) {
        return actions.stringEdit(noProgress, id, identifier, newText, newContext, newMaxLength, newIsHidden);
    }


}
