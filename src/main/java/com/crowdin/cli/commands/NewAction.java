package com.crowdin.cli.commands;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.properties.Properties;

@FunctionalInterface
public interface NewAction<P extends Properties, C extends Client> {
    void act(Outputter out, P properties, C client);
}
