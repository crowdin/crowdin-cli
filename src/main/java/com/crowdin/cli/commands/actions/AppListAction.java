package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

class AppListAction implements NewAction<ProjectProperties, ProjectClient> {
    private final boolean plainView;

    public AppListAction(boolean plainView) {
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        client
                .listApplications()
                .forEach(app -> {
                    if (!plainView) {
                        out.println(String.format(RESOURCE_BUNDLE.getString("message.application.list"), app.getIdentifier(), app.getName()));
                    } else {
                        out.println(app.getIdentifier());
                    }
                });
    }
}
