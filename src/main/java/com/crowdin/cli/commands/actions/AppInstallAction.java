package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ExecutionStatus;
import lombok.RequiredArgsConstructor;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

@RequiredArgsConstructor
class AppInstallAction implements NewAction<ProjectProperties, ProjectClient> {

    private final String id;

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        var manifestUrl = client.findManifestUrl(id);
        if (manifestUrl.isEmpty()) {
            throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("error.application_not_found"), this.id));
        }
        client.installApplication(manifestUrl.get());
        out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.application.install"), id)));
    }
}
