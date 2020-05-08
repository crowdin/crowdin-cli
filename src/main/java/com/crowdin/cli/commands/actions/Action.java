package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.properties.PropertiesBean;

public interface Action {

    void act(PropertiesBean pb, Client client);
}
