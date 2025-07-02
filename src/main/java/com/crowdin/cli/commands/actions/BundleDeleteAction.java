package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.bundles.model.Bundle;

import java.util.List;
import java.util.Objects;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

class BundleDeleteAction implements NewAction<ProjectProperties, ClientBundle> {

    private final Long bundleId;

    public BundleDeleteAction(Long bundleId) {
        this.bundleId = bundleId;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientBundle client) {
        Bundle bundleToDelete = client.getBundle(bundleId);
        if (Objects.isNull(bundleToDelete)) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.bundle.not_found")));
            return;
        }
        client.deleteBundle(bundleId);
        out.println(ExecutionStatus.OK.withIcon(
            String.format(RESOURCE_BUNDLE.getString("message.bundle_deleted"), bundleId)
        ));
    }
}
