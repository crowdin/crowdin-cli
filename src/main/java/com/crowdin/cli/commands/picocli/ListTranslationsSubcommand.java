package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.PropertiesWithFiles;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.LIST_TRANSLATIONS,
    sortOptions = false
)
class ListTranslationsSubcommand extends ActCommandWithFiles {

    @CommandLine.Option(names = {"--tree"}, order = -2)
    protected boolean treeView;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<PropertiesWithFiles, ProjectClient> getAction(Actions actions) {
        return actions.listTranslations(this.noProgress, this.treeView, false, this.plainView, false, true);
    }

    @Override
    protected final boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }
}
