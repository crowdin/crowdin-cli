package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.bundles.model.Bundle;


import java.util.List;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.LIST_ITEM;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class BundleListAction implements NewAction<ProjectProperties, ClientBundle> {

    private final boolean plainView;

    public BundleListAction(boolean plainView) {
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientBundle client) {
        List<Bundle> bundles = client.listBundle();
        for (Bundle bundle : bundles) {
            String okMessage = "message.bundle.list";
            if (!plainView) {
                out.println(LIST_ITEM.withIcon(
                        String.format(RESOURCE_BUNDLE.getString(okMessage), bundle.getId(), bundle.getName(), bundle.getFormat(), bundle.getExportPattern())));
            } else {
                out.println(bundle.getId() + " " + bundle.getName());
            }
        }
        if (bundles.isEmpty()) {
            if (!plainView) {
                out.println(OK.withIcon(RESOURCE_BUNDLE.getString("message.bundle.list_empty")));
            }
        }
    }
}
