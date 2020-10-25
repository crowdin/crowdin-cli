package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientTm;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.BaseProperties;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.TM_LIST
)
class TmListSubcommand extends ActCommandTm {

    @Override
    protected NewAction<BaseProperties, ClientTm> getAction(Actions actions) {
        return actions.tmList(this.plainView);
    }

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }
}
