package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientGlossary;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.BaseProperties;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.GLOSSARY_LIST
)
class GlossaryListSubcommand extends ActCommandGlossary {

    @Override
    protected NewAction<BaseProperties, ClientGlossary> getAction(Actions actions) {
        return actions.glossaryList(this.plainView, this.isVerbose);
    }

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected final boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }
}
