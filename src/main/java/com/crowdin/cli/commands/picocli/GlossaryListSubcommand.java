package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.ClientAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.GLOSSARY_LIST
)
public class GlossaryListSubcommand extends ClientActPlainMixin {

    @Override
    protected ClientAction getAction(Actions actions) {
        return actions.glossaryList(this.plainView, this.isVerbose);
    }
}
