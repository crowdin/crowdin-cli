package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.distributions.model.AddDistributionRequest;
import com.crowdin.client.distributions.model.Distribution;
import com.crowdin.client.distributions.model.ExportMode;
import com.crowdin.client.sourcefiles.model.FileInfo;
import lombok.AllArgsConstructor;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@AllArgsConstructor
class DistributionAddAction implements NewAction<ProjectProperties, ClientDistribution> {

    private boolean noProgress;
    private boolean plainView;
    private String name;
    private ExportMode exportMode;
    private List<String> files;
    private List<Integer> bundleIds;
    private String branch;

    private ProjectClient projectClient;

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientDistribution client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(
            out,
            "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress,
            this.plainView,
            () -> this.projectClient.downloadFullProject(this.branch)
        );

        if (files != null) {
            List<String> projectFiles = project.getFiles().stream().map(FileInfo::getPath).collect(Collectors.toList());
            List<String> notExistingFiles = files.stream().filter(file -> !projectFiles.contains(file))
                                                 .collect(Collectors.toList());
            if (!notExistingFiles.isEmpty()) {
                throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.file_not_found"),
                                                         String.join("\n", notExistingFiles)));
            }
        }

        List<Long> fileIds = files == null ? null : project
            .getFiles()
            .stream()
            .filter(file -> files.contains(file.getPath()))
            .map(FileInfo::getId)
            .collect(Collectors.toList());

        Distribution distribution;
        AddDistributionRequest addDistributionRequest = RequestBuilder.addDistribution(name, exportMode, fileIds, bundleIds);
        Optional.ofNullable(name).ifPresent(addDistributionRequest::setName);
        Optional.ofNullable(exportMode).ifPresent(addDistributionRequest::setExportMode);
        Optional.ofNullable(fileIds).ifPresent(addDistributionRequest::setFileIds);
        Optional.ofNullable(bundleIds).ifPresent(addDistributionRequest::setBundleIds);

        try {
            distribution = client.addDistribution(addDistributionRequest);
        } catch (Exception e) {
            throw new RuntimeException(
                    String.format(RESOURCE_BUNDLE.getString("error.distribution_is_not_added"), addDistributionRequest), e);
        }
        if (!plainView) {
            out.println(
                    OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.distribution.added"),
                                              distribution.getName())));
        } else {
            out.println(String.valueOf(distribution.getName()));
        }
    }
}
