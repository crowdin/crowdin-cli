package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.ClientAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.LIST_TRANSLATIONS
)
class ListTranslationsSubcommand extends ClientActPlainMixin {

    @CommandLine.Option(names = {"--tree"})
    protected boolean treeView;

    @Override
    protected ClientAction getAction(Actions actions) {
        return actions.listTranslations(this.noProgress, this.treeView, false, this.plainView);
    }
}
