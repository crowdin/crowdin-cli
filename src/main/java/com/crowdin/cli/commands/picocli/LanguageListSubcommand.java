package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.LIST,
    sortOptions = false
)
class LanguageListSubcommand extends ActCommandProject {

    @CommandLine.Option(names = {"--code"}, descriptionKey = "crowdin.language.list.code", paramLabel = "...", order = -2)
    protected BaseCli.LanguageCode code;

    @CommandLine.Option(names = {"--all"}, descriptionKey = "crowdin.language.list.all", order = -2)
    protected boolean all;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.listLanguages(code, all, noProgress, plainView);
    }

    @Override
    protected final boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }
}
