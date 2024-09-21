package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.core.model.PatchOperation;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.core.model.Priority;
import com.crowdin.client.sourcefiles.model.Branch;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

class BranchEditAction implements NewAction<ProjectProperties, ProjectClient> {

    private final String branch;
    private final String name;
    private final String title;
    private final Priority priority;
    private final String exportPattern;
    private final boolean noProgress;
    private final boolean plainView;

    BranchEditAction(String branch, String name, String title, Priority priority, String exportPattern, boolean noProgress, boolean plainView) {
        this.branch = branch;
        this.name = name;
        this.title = title;
        this.priority = priority;
        this.exportPattern = exportPattern;
        this.noProgress = noProgress;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, this.plainView, client::downloadFullProject);

        Optional<Branch> branchObj = project.findBranchByName(this.branch);
        if (branchObj.isEmpty()) {
            throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("error.branch_not_exists"), this.branch));
        }

        List<PatchRequest> requests = new ArrayList<>();
        if (name != null) {
            PatchRequest request = RequestBuilder.patch(name, PatchOperation.REPLACE, "/name");
            requests.add(request);
        }
        if (title != null) {
            PatchRequest request = RequestBuilder.patch(title, PatchOperation.REPLACE, "/title");
            requests.add(request);
        }
        if (priority != null) {
            PatchRequest request = RequestBuilder.patch(priority, PatchOperation.REPLACE, "/priority");
            requests.add(request);
        }
        if (exportPattern != null) {
            PatchRequest request = RequestBuilder.patch(exportPattern, PatchOperation.REPLACE, "/exportPattern");
            requests.add(request);
        }

        Branch updatedBranch = client.editBranch(branchObj.get().getId(), requests);

        if (!plainView) {
            out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch.list"), updatedBranch.getId(), updatedBranch.getName())));
        } else {
            out.println(updatedBranch.getName());
        }
    }
}
