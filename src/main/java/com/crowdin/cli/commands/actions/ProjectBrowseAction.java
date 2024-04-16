package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;

import java.awt.*;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

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
