package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ExecutionStatus;
import lombok.RequiredArgsConstructor;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

@RequiredArgsConstructor
class AppUninstallAction implements NewAction<ProjectProperties, ProjectClient> {

    private final String id;
    private final boolean force;

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        client.uninstallApplication(id, force);
        out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.application.uninstall"), id)));
    }
}
