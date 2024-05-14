package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.distributions.model.Distribution;

import java.util.List;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class DistributionListAction implements NewAction<ProjectProperties, ClientDistribution> {

    private final boolean plainView;

    public DistributionListAction(boolean plainView) {
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientDistribution client) {
        List<Distribution> distributions = client.listDistribution();

        for (Distribution distribution : distributions) {
            if (!plainView) {
                out.println(String.format(RESOURCE_BUNDLE.getString("message.distribution.list"), distribution.getHash(),
                                          distribution.getName(),
                                          distribution.getExportMode()));
            } else {
                out.println(String.format("%s %s", distribution.getHash(), distribution.getName()));
            }
        }

        if (distributions.isEmpty()) {
            if (!plainView) {
                out.println(OK.withIcon(RESOURCE_BUNDLE.getString("message.distribution.list_empty")));
            } else {
                out.println(RESOURCE_BUNDLE.getString("message.distribution.list_empty"));
            }
        }
    }
}
