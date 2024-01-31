package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.client.CrowdinProjectInfo;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.distributions.model.DistributionRelease;
import com.crowdin.client.distributions.model.DistributionStringsBasedRelease;
import com.crowdin.client.projectsgroups.model.Type;
import lombok.AllArgsConstructor;

import java.util.Objects;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@AllArgsConstructor
class DistributionReleaseAction implements NewAction<ProjectProperties, ClientDistribution> {

    private boolean noProgress;
    private boolean plainView;
    private String hash;

    private ProjectClient projectClient;

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientDistribution client) {
        CrowdinProjectInfo project = ConsoleSpinner.execute(
            out,
            "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress,
            this.plainView,
            () -> this.projectClient.downloadProjectInfo()
        );
        if (Objects.equals(project.getType(), Type.FILES_BASED)) {
            this.releaseDistributionFilesBased(out, client);
        } else if (Objects.equals(project.getType(), Type.STRINGS_BASED)) {
            this.releaseDistributionStringsBased(out, client);
        }
        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.distribution.released"), hash)));
    }

    private DistributionRelease releaseDistributionFilesBased(Outputter out, ClientDistribution client) {
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
                            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.distribution_failed"));
                        }
                    }

                    ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.spinner.releasing_distribution_percents"), 100));

                    return release;
                }
        );
    }

    private DistributionStringsBasedRelease releaseDistributionStringsBased(Outputter out, ClientDistribution client) {
        return ConsoleSpinner.execute(
                out,
                "message.spinner.releasing_distribution",
                "error.distribution_is_not_released",
                this.noProgress,
                false,
                () -> {
                    DistributionStringsBasedRelease release = client.releaseStringsBased(hash);

                    while (!"success".equalsIgnoreCase(release.getStatus())) {
                        ConsoleSpinner.update(
                                String.format(RESOURCE_BUNDLE.getString("message.spinner.releasing_distribution_percents"),
                                              release.getProgress()));
                        Thread.sleep(1000);

                        release = client.getDistributionStringsBasedRelease(hash);

                        if ("failed".equalsIgnoreCase(release.getStatus())) {
                            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.distribution_failed"));
                        }
                    }

                    ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.spinner.releasing_distribution_percents"), 100));

                    return release;
                }
        );
    }
}
