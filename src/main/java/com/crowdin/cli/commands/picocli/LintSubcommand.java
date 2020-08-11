package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.ClientAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.LINT)
class LintSubcommand extends ClientActCommand {

    protected ClientAction getAction(Actions actions) {
        return (out, pb, client) ->
            out.println(CommandLine.Help.Ansi.AUTO.string(RESOURCE_BUNDLE.getString("message.configuration_ok")));
    }
}
