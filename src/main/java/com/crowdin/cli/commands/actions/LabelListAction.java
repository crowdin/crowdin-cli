package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientLabel;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.labels.model.Label;
import lombok.AllArgsConstructor;

import java.util.List;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@AllArgsConstructor
class LabelListAction implements NewAction<ProjectProperties, ClientLabel> {

    private final boolean plainView;
    private final boolean isVerbose;

    @Override
    public void act(Outputter out, ProjectProperties properties, ClientLabel client) {
        List<Label> labels = client.listLabels();
        for (Label label : labels) {
            if (!plainView || isVerbose) {
                out.println(String.format(RESOURCE_BUNDLE.getString("message.label.list"),
                    label.getId(), label.getTitle()));
            } else {
                out.println(label.getTitle());
            }
        }
        if (labels.isEmpty()) {
            if (!plainView && !isVerbose) {
                out.println(OK.withIcon(RESOURCE_BUNDLE.getString("message.label.list_empty")));
            } else {
                out.println(RESOURCE_BUNDLE.getString("message.label.list_empty"));
            }
        }
    }
}
