package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.PropertiesBean;
import picocli.CommandLine;

import java.util.Collections;
import java.util.List;

abstract class ClientActCommand extends GenericCommand {

    @CommandLine.Mixin
    private ConfigurationProperties configProperties;

    @Override
    protected final void act(Actions actions, Outputter out) {
        PropertiesBean pb = actions
            .buildProperties(configProperties.getConfigFile(), configProperties.getIdentityFile(), configProperties.getParams())
            .act(out);
        Client client = Client.getDefault(pb.getApiToken(), pb.getBaseUrl(), Long.parseLong(pb.getProjectId()));
        ClientAction action = getAction(actions);
        action.act(out, pb, client);
    }

    protected abstract ClientAction getAction(Actions actions);

    protected List<String> checkOptions() {
        return Collections.emptyList();
    }

    protected boolean isAnsi() {
        return !this.noColors;
    }
}
