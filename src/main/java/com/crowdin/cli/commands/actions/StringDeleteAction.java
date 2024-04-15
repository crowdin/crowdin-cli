package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class StringDeleteAction implements NewAction<ProjectProperties, ProjectClient> {

    private final Long id;

    public StringDeleteAction(Long id) {
        this.id = id;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        client.deleteSourceString(id);
        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.source_string_deleted"), this.id)));
    }
}
