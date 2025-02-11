package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.commands.picocli.GenericActCommand;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.core.model.PatchOperation;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.distributions.model.Distribution;
import com.crowdin.client.distributions.model.ExportMode;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.FileInfo;
import lombok.AllArgsConstructor;

import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.client.distributions.model.ExportMode.BUNDLE;
import static com.crowdin.client.distributions.model.ExportMode.DEFAULT;

@AllArgsConstructor
class DistributionEditAction implements NewAction<ProjectProperties, ClientDistribution> {

    private String hash;
    private boolean noProgress;
    private boolean plainView;
    private String name;
    private ExportMode exportMode;
    private List<String> files;
    private List<Integer> bundleIds;
    private String branch;

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientDistribution client) {
        var projectClient = GenericActCommand.getProjectClient(pb);
        CrowdinProjectFull project = ConsoleSpinner.execute(
            out,
            "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress,
            this.plainView,
            () -> projectClient.downloadFullProject(this.branch)
        );
        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);

        List<Distribution> distributions = client.listDistribution();
        Optional<Distribution> foundDistribution = distributions.stream()
            .filter(d -> d.getHash().equals(hash))
            .findFirst();

        if (foundDistribution.isEmpty()) {
            throw new ExitCodeExceptionMapper.ValidationException(String.format(RESOURCE_BUNDLE.getString("error.distribution.not_found"), hash));
        }
        String existingExportMode = foundDistribution.get().getExportMode();

        List<PatchRequest> requests = new ArrayList<>();

        if (name != null) {
            PatchRequest request = RequestBuilder.patch(name, PatchOperation.REPLACE, "/name");
            requests.add(request);
        }
        if (exportMode != null) {
            List<Integer> existingBundleIds = foundDistribution.get().getBundleIds();
            if (BUNDLE.equals(exportMode) && (existingBundleIds == null || existingBundleIds.isEmpty()) && bundleIds == null) {
                throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.distribution.empty_bundle_ids"));
            }
            if (isStringsBasedProject) {
                throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.distribution.strings_based_export_mode"));
            }
            PatchRequest request = RequestBuilder.patch(exportMode, PatchOperation.REPLACE, "/exportMode");
            requests.add(request);
        }
        if (files != null) {
            if (isStringsBasedProject) {
                throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("message.no_file_string_project"));
            }
            if (BUNDLE.equals(exportMode)) {
                throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.distribution.incorrect_file_command_usage"));
            }
            if (BUNDLE.name().equals(existingExportMode) && !DEFAULT.equals(exportMode)) {
                throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.distribution.incorrect_file_command_usage"));
            }
            List<Long> fileIds = this.prepareFileIds(project);
            if (!fileIds.isEmpty()) {
                PatchRequest request = RequestBuilder.patch(fileIds, PatchOperation.REPLACE, "/fileIds");
                requests.add(request);
            }
        }
        if (bundleIds != null) {
            if (DEFAULT.equals(exportMode)) {
                throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.distribution.incorrect_bundle_id_command_usage"));
            }
            if (DEFAULT.name().equals(existingExportMode) && !BUNDLE.equals(exportMode)) {
                throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.distribution.incorrect_bundle_id_command_usage"));
            }
            PatchRequest request = RequestBuilder.patch(bundleIds, PatchOperation.REPLACE, "/bundleIds");
            requests.add(request);
        }

        Distribution updatedDistribution = client.editDistribution(hash, requests);
        if (!plainView) {
            out.println(ExecutionStatus.OK.withIcon(
                String.format(RESOURCE_BUNDLE.getString("message.distribution.list"), updatedDistribution.getHash(), updatedDistribution.getName(), updatedDistribution.getExportMode())
            ));
        } else {
            out.println(updatedDistribution.getName());
        }
    }

    private List<Long> prepareFileIds(CrowdinProjectFull project) {
        List<String> projectFiles = project.getFiles().stream()
            .map(FileInfo::getPath)
            .toList();
        List<String> notExistingFiles = files.stream()
            .map(file -> branch == null ? file : Paths.get(branch, file).toString())
            .map(Utils::sepAtStart)
            .map(Utils::toUnixPath)
            .filter(file -> !projectFiles.contains(file))
            .toList();
        if (!notExistingFiles.isEmpty()) {
            throw new ExitCodeExceptionMapper.NotFoundException(notExistingFiles.stream().map(Utils::noSepAtStart)
                .map(file -> String.format(RESOURCE_BUNDLE.getString("error.file_not_found"), file))
                .collect(Collectors.joining("\n\u274C ")));
        }
        files = branch != null ? files.stream().map(file -> Paths.get(branch, file).toString())
            .collect(Collectors.toList()) : files;
        files = files.stream().map(Utils::sepAtStart).map(Utils::toUnixPath).collect(Collectors.toList());
        return project
            .getFiles()
            .stream()
            .filter(file -> files.contains(file.getPath()))
            .map(FileInfo::getId)
            .collect(Collectors.toList());
    }
}
