package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.*;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.Properties;
import com.crowdin.cli.properties.PropertiesBuilders;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

public abstract class GenericActCommand<P extends Properties, C extends Client> extends GenericCommand {

    private static Actions actions;
    protected static PropertiesBuilders propertiesBuilders;

    public static void init(Actions actions, PropertiesBuilders propertiesBuilders) {
        GenericActCommand.actions = actions;
        GenericActCommand.propertiesBuilders = propertiesBuilders;
    }

    @Override
    public final void run() {
        Outputter out = new PicocliOutputter(System.out, isAnsi());
        P properties = this.getProperties(propertiesBuilders, out);

        List<String> errors = new ArrayList<>(Optional.ofNullable(checkOptions()).orElse(new ArrayList<>()));
        errors.addAll(checkOptions(properties));

        if (!errors.isEmpty()) {
            String errorsInOne = errors.stream()
                .map(error -> String.format(RESOURCE_BUNDLE.getString("message.item_list"), error))
                .collect(Collectors.joining("\n"));
            throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.params_are_invalid") + "\n" + errorsInOne);
        }

        NewAction<P, C> action = this.getAction(actions);
        C client = this.getClient(properties);

        action.act(out, properties, client);
    }

    protected abstract NewAction<P, C> getAction(Actions actions);

    protected abstract P getProperties(PropertiesBuilders propertiesBuilders, Outputter out);

    protected abstract C getClient(P properties);

    protected List<String> checkOptions() {
        return Collections.emptyList();
    }

    protected List<String> checkOptions(P props) {
        return Collections.emptyList();
    }

    protected boolean isAnsi() {
        return !this.noColors;
    }

    //Utilities to get different clients inside the action

    public static ProjectClient getProjectClient(ProjectProperties properties) {
        return Clients.getProjectClient(properties.getApiToken(), properties.getBaseUrl(), Long.parseLong(properties.getProjectId()));
    }

    public static ClientBundle getBundleClient(ProjectProperties properties) {
        return Clients.getClientBundle(properties.getApiToken(), properties.getBaseUrl(), properties.getProjectId());
    }

    public static ClientComment getCommentClient(ProjectProperties properties) {
        return Clients.getClientComment(properties.getApiToken(), properties.getBaseUrl(), properties.getProjectId());
    }

    public static ClientLabel getLabelClient(ProjectProperties properties) {
        return Clients.getClientLabel(properties.getApiToken(), properties.getBaseUrl(), properties.getProjectId());
    }

    public static ClientGlossary getGlossaryClient(BaseProperties properties) {
        return Clients.getClientGlossary(properties.getApiToken(), properties.getBaseUrl());
    }

    public static ClientTm getTmClient(BaseProperties properties) {
        return Clients.getClientTm(properties.getApiToken(), properties.getBaseUrl());
    }
}
