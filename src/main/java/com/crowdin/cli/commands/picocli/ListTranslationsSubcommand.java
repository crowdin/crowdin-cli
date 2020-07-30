package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.actions.ClientAction;
import com.crowdin.cli.commands.actions.ListTranslationsAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = "translations")
class ListTranslationsSubcommand extends ClientActCommand {

    @CommandLine.Option(names = {"--tree"})
    protected boolean treeView;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected ClientAction getAction() {
        return new ListTranslationsAction(this.noProgress, this.treeView, false, this.plainView);
    }

    @Override
    protected boolean isAnsi() {
        return !plainView;
    }
}
