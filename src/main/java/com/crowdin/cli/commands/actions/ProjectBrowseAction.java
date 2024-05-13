package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;

import java.awt.*;
import java.net.URI;

class ProjectBrowseAction implements NewAction<ProjectProperties, ProjectClient> {

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        try {
            Desktop.getDesktop().browse(new URI(client.getProjectUrl()));
        } catch (Exception e) {
            throw new RuntimeException("Unexpected error");
        }
    }
}
