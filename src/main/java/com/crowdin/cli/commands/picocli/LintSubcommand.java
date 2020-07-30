package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.actions.ClientAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = "lint")
class LintSubcommand extends ClientActCommand {

    protected ClientAction getAction() {
        return (out, pb, client) ->
            out.println(CommandLine.Help.Ansi.AUTO.string(RESOURCE_BUNDLE.getString("message.configuration_ok")));
    }
}
