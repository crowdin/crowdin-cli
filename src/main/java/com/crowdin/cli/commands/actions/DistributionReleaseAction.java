package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.client.CrowdinProjectInfo;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.commands.picocli.GenericActCommand;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.distributions.model.Distribution;
import com.crowdin.client.distributions.model.DistributionRelease;
import com.crowdin.client.distributions.model.DistributionStringsBasedRelease;
import com.crowdin.client.projectsgroups.model.Type;
import lombok.AllArgsConstructor;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@AllArgsConstructor
class DistributionReleaseAction implements NewAction<ProjectProperties, ClientDistribution> {

    private boolean noProgress;
    private boolean plainView;
    private String hash;

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientDistribution client) {
        var projectClient = GenericActCommand.getProjectClient(pb);

        List<Distribution> distributions = client.listDistribution();
        Optional<Distribution> foundDistribution = distributions.stream()
            .filter(d -> d.getHash().equals(hash))
            .findFirst();

        if (foundDistribution.isEmpty()) {
            throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("error.distribution.not_found"), hash));
        }

        CrowdinProjectInfo project = ConsoleSpinner.execute(
            out,
            "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress,
            this.plainView,
            projectClient::downloadProjectInfo
        );
        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);

        if (!isStringsBasedProject) {
            this.releaseDistributionFilesBased(out, client);
        } else {
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
