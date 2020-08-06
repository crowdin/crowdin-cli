package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.commands.actions.ClientAction;
import com.crowdin.cli.commands.actions.Outputter;
import com.crowdin.cli.properties.PropertiesBean;
import picocli.CommandLine;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

abstract class ClientActCommand extends GenericCommand {

    @CommandLine.Mixin
    private PropertiesBuilderCommandPart propertiesBuilderCommandPart;

    @Override
    public final void run() {
        List<String> errors = checkOptions();
        if (errors != null && !errors.isEmpty()) {
            String errorsInOne = errors.stream()
                .map(error -> String.format(RESOURCE_BUNDLE.getString("message.item_list"), error))
                .collect(Collectors.joining("\n"));
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.params_are_invalid") + "\n" + errorsInOne);
        }
        PropertiesBean pb = propertiesBuilderCommandPart.buildPropertiesBean();
        Client client = Client.getDefault(pb.getApiToken(), pb.getBaseUrl(), Long.parseLong(pb.getProjectId()));
        Outputter out = new PicocliOutputter(System.out, isAnsi());
        ClientAction action = getAction();
        action.act(out, pb, client);
    }

    protected abstract ClientAction getAction();

    protected List<String> checkOptions() {
        return Collections.emptyList();
    }

    protected boolean isAnsi() {
        return !this.noColors;
    }
}
