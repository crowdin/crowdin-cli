package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.distributions.model.DistributionRelease;
import lombok.AllArgsConstructor;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@AllArgsConstructor
class DistributionReleaseAction implements NewAction<ProjectProperties, ClientDistribution> {

    private boolean noProgress;
    private String hash;

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientDistribution client) {
        DistributionRelease distributionRelease;

        // TODO: check progress

        try {
            distributionRelease = client.release(hash);
        } catch (Exception e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.distribution_is_not_released"), hash), e);
        }

        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.distribution.released"), hash)));
    }
}
