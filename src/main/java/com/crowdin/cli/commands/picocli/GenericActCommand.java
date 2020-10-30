package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.Properties;
import com.crowdin.cli.properties.PropertiesBuilders;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public abstract class GenericActCommand<P extends Properties, C extends Client> extends GenericCommand {

    private static Actions actions;
    private static PropertiesBuilders propertiesBuilders;

    public static void init(Actions actions, PropertiesBuilders propertiesBuilders) {
        GenericActCommand.actions = actions;
        GenericActCommand.propertiesBuilders = propertiesBuilders;
    }

    @Override
    public final void run() {
        List<String> errors = checkOptions();
        if (errors != null && !errors.isEmpty()) {
            String errorsInOne = errors.stream()
                .map(error -> String.format(RESOURCE_BUNDLE.getString("message.item_list"), error))
                .collect(Collectors.joining("\n"));
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.params_are_invalid") + "\n" + errorsInOne);
        }
        Outputter out = new PicocliOutputter(System.out, isAnsi());
        NewAction<P, C> action = this.getAction(actions);
        P properties = this.getProperties(propertiesBuilders, out);
        C client = this.getClient(properties);
        action.act(out, properties, client);
    }

    protected abstract NewAction<P, C> getAction(Actions actions);

    protected abstract P getProperties(PropertiesBuilders propertiesBuilders, Outputter out);

    protected abstract C getClient(P properties);

    protected List<String> checkOptions() {
        return Collections.emptyList();
    }

    protected boolean isAnsi() {
        return !this.noColors;
    }
}
