package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.distributions.model.DistributionRelease;
import lombok.AllArgsConstructor;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@AllArgsConstructor
class DistributionReleaseAction implements NewAction<ProjectProperties, ClientDistribution> {

    private boolean noProgress;
    private boolean plainView;
    private String hash;

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientDistribution client) {
        this.releaseDistribution(out, client);
        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.distribution.released"), hash)));
    }

    private DistributionRelease releaseDistribution(Outputter out, ClientDistribution client) {
        return ConsoleSpinner.execute(
                out,
                "message.spinner.releasing_distribution",
                "error.distribution_is_not_released",
                this.noProgress,
                false,
                () -> {
                    DistributionRelease release = client.release(hash);

                    while (!"success".equalsIgnoreCase(release.getStatus())) {
                        ConsoleSpinner.update(
                                String.format(RESOURCE_BUNDLE.getString("message.spinner.releasing_distribution_percents"),
                                              release.getProgress()));
                        Thread.sleep(1000);

                        release = client.getDistributionRelease(hash);

                        if ("failed".equalsIgnoreCase(release.getStatus())) {
                            throw new RuntimeException(RESOURCE_BUNDLE.getString("message.spinner.build_has_failed"));
                        }
                    }

                    ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.spinner.releasing_distribution_percents"), 100));

                    return release;
                }
        );
    }
}
