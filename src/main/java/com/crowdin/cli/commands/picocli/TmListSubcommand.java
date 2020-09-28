package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.ClientAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.TM_LIST
)
class TmListSubcommand extends ClientActPlainMixin {

    @Override
    protected ClientAction getAction(Actions actions) {
        return actions.tmList(this.plainView);
    }
}
