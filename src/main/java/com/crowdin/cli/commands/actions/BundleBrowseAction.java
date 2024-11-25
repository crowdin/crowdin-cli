package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import lombok.AllArgsConstructor;

import java.awt.*;
import java.net.URI;

@AllArgsConstructor
class BundleBrowseAction implements NewAction<ProjectProperties, ClientBundle> {

    Long id;

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientBundle client) {
        try {
            Desktop.getDesktop().browse(new URI(client.getBundleUrl(id)));
        } catch (Exception e) {
            throw new RuntimeException("Unexpected error");
        }
    }
}
