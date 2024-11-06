package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.properties.ProjectProperties;
import lombok.AllArgsConstructor;

import java.awt.*;
import java.net.URI;

@AllArgsConstructor
class BundleBrowseAction implements NewAction<ProjectProperties, ClientBundle> {

    Long id;
    ProjectClient projectClient;

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientBundle client) {
        boolean isOrganization = PropertiesBeanUtils.isOrganization(pb.getBaseUrl());
        String projectUrl = projectClient.getProjectUrl();
        String bundleUrl = isOrganization
            ? projectUrl + "/translations/bundle/" +  id
            : projectUrl + "/translations#bundle:" + id;
        try {
            Desktop.getDesktop().browse(new URI(bundleUrl));
        } catch (Exception e) {
            throw new RuntimeException("Unexpected error");
        }
    }
}
