package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

import java.util.Collections;
import java.util.List;

@CommandLine.Command(
    name = CommandNames.STRING_DELETE,
    sortOptions = false
)
class StringDeleteSubcommand extends ActCommandProject {

    @CommandLine.Option(names = {"--id"}, paramLabel = "...", order = -2)
    protected List<Long> ids;

    @CommandLine.Option(names = {"--text"}, paramLabel = "...", hidden = true)
    protected List<String> texts;

    @CommandLine.Option(names = {"--identifier"}, paramLabel = "...", order = -2)
    protected List<String> identifiers;

    @Override
    protected List<String> checkOptions() {
        if ((ids == null || ids.isEmpty()) && (texts == null || texts.isEmpty()) && (identifiers == null || identifiers.isEmpty())) {
            return Collections.singletonList(RESOURCE_BUNDLE.getString("error.source_string_id_not_specified"));
        } else {
            return Collections.emptyList();
        }
    }

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.stringDelete(noProgress, ids, texts, identifiers);
    }
}
