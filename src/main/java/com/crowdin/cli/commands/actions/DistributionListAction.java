package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.distributions.model.Distribution;
import org.apache.commons.lang3.StringUtils;

import java.util.List;
import java.util.Objects;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class DistributionListAction implements NewAction<ProjectProperties, ClientDistribution> {

    private final boolean plainView;
    private final boolean isVerbose;

    public DistributionListAction(boolean plainView, boolean isVerbose) {
        this.plainView = plainView;
        this.isVerbose = isVerbose;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientDistribution client) {
        List<Distribution> distributions = client.listDistribution();
        for (Distribution distribution : distributions) {
            if (!plainView) {
                out.println(String.format(RESOURCE_BUNDLE.getString("message.distribution.list"), distribution.getHash(),
                                          distribution.getName(),
                                          distribution.getExportMode(),
                                          Objects.toString(distribution.getFormat(), StringUtils.EMPTY),
                                          Objects.toString(distribution.getExportPattern(), StringUtils.EMPTY)));
            } else {
                out.println(distribution.getHash() + " " + distribution.getName());
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
