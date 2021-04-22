package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.PropertiesWithFiles;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.LIST_LANGUAGES
)
class ListLanguagesSubcommand extends ActCommandWithFiles {

    @CommandLine.Option(names = {"--code"}, paramLabel = "...")
    protected BaseCli.LanguageCode code;

    @Override
    protected NewAction<PropertiesWithFiles, ProjectClient> getAction(Actions actions) {
        return actions.listLanguages(code, noProgress, plainView);
    }

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected final boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }

}
