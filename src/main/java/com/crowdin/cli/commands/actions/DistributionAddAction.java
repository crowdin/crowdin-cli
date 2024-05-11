package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.distributions.model.AddDistributionRequest;
import com.crowdin.client.distributions.model.AddDistributionStringsBasedRequest;
import com.crowdin.client.distributions.model.Distribution;
import com.crowdin.client.distributions.model.ExportMode;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.FileInfo;
import lombok.AllArgsConstructor;

import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.client.distributions.model.ExportMode.DEFAULT;

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
        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);

        List<Long> fileIds = null;
        if (files != null) {
            if (isStringsBasedProject) {
                throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("message.no_file_string_project"));
            }
            Map<String, Long> projectBranches = project.getBranches().values().stream()
                                                       .collect(Collectors.toMap(Branch::getName, Branch::getId));
            List<String> projectFiles = project.getFiles().stream()
                                               .filter(file -> branch == null || file.getBranchId().equals(projectBranches.get(branch)))
                                               .map(FileInfo::getPath)
                                               .collect(Collectors.toList());
            List<String> notExistingFiles = files.stream()
                                                 .map(file -> branch == null ? file : Paths.get(branch, file).toString())
                                                 .map(Utils::sepAtStart)
                                                 .filter(file -> !projectFiles.contains(file))
                                                 .collect(Collectors.toList());
            if (!notExistingFiles.isEmpty()) {
                throw new ExitCodeExceptionMapper.NotFoundException(notExistingFiles.stream().map(Utils::noSepAtStart)
                     .map(file -> String.format(RESOURCE_BUNDLE.getString("error.file_not_found"), file))
                     .collect(Collectors.joining("\n\u274C ")));
            }
            files = branch != null ? files.stream().map(file -> Paths.get(branch, file).toString())
                                          .collect(Collectors.toList()) : files;
            files = files.stream().map(Utils::sepAtStart).collect(Collectors.toList());
            fileIds = project
                    .getFiles()
                    .stream()
                    .filter(file -> files.contains(file.getPath()))
                    .map(FileInfo::getId)
                    .collect(Collectors.toList());
        } else if (exportMode == DEFAULT && !isStringsBasedProject) {
            throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.distribution.empty_file"));
        }

        Distribution distribution = null;
        if (!isStringsBasedProject) {
            AddDistributionRequest addDistributionRequest = RequestBuilder.addDistribution(name, exportMode, fileIds, bundleIds);
            Optional.ofNullable(name).ifPresent(addDistributionRequest::setName);
            Optional.ofNullable(exportMode).ifPresent(addDistributionRequest::setExportMode);
            Optional.ofNullable(fileIds).ifPresent(addDistributionRequest::setFileIds);
            Optional.ofNullable(bundleIds).ifPresent(addDistributionRequest::setBundleIds);

            try {
                distribution = client.addDistribution(addDistributionRequest);
            } catch (Exception e) {
                throw ExitCodeExceptionMapper.remap(e, String.format(RESOURCE_BUNDLE.getString("error.distribution_is_not_added"), addDistributionRequest));
            }
        } else if (isStringsBasedProject) {
            AddDistributionStringsBasedRequest addDistributionRequest = new AddDistributionStringsBasedRequest();
            addDistributionRequest.setName(name);
            if (Objects.isNull(bundleIds)) {
                throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.distribution.empty_bundle_ids"));
            }
            addDistributionRequest.setBundleIds(bundleIds);

            try {
                distribution = client.addDistributionStringsBased(addDistributionRequest);
            } catch (Exception e) {
                throw ExitCodeExceptionMapper.remap(e, String.format(RESOURCE_BUNDLE.getString("error.distribution_is_not_added"), addDistributionRequest));
            }
        }

        if (!plainView) {
            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.distribution.list"), distribution.getHash(), distribution.getName(), distribution.getExportMode())));
        } else {
            out.println(String.valueOf(distribution.getName()));
        }
    }
}
