package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.actions.ClientAction;
import com.crowdin.cli.commands.actions.StringDeleteAction;
import picocli.CommandLine;

import java.util.Collections;
import java.util.List;

@CommandLine.Command(
    name = "delete"
)
class StringDeleteSubcommand extends ClientActCommand {

    @CommandLine.Option(names = {"--id"}, paramLabel = "...")
    protected List<Long> ids;

    @CommandLine.Option(names = {"--text"}, paramLabel = "...", hidden = true)
    protected List<String> texts;

    @CommandLine.Option(names = {"--identifier"}, paramLabel = "...", hidden = true)
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
    protected ClientAction getAction() {
        return new StringDeleteAction(noProgress, ids, texts, identifiers);
    }
}
