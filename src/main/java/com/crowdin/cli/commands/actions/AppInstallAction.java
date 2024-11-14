package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ExecutionStatus;
import lombok.RequiredArgsConstructor;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

@RequiredArgsConstructor
class AppInstallAction implements NewAction<ProjectProperties, ProjectClient> {

    private final String id;

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        client.installApplication(this.findManifestUrl(id));
        out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.application.install"), id)));
    }

    private String findManifestUrl(String id) {
        //TODO fix me
        return id;
    }
}
