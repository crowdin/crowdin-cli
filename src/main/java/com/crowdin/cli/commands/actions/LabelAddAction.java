package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientLabel;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.labels.model.AddLabelRequest;
import com.crowdin.client.labels.model.Label;
import lombok.AllArgsConstructor;

import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.SKIPPED;

@AllArgsConstructor
class LabelAddAction implements NewAction<ProjectProperties, ClientLabel> {

    private final String title;
    private final boolean plainView;

    @Override
    public void act(Outputter out, ProjectProperties properties, ClientLabel client) {
        Map<String, Long> labels = client.listLabels().stream()
            .collect(Collectors.toMap(Label::getTitle, Label::getId));
        if (!labels.containsKey(title)) {
            AddLabelRequest request = new AddLabelRequest();
            request.setTitle(title);
            Label label = client.addLabel(request);
            if (!plainView) {
                out.println(ExecutionStatus.OK.withIcon(
                    String.format(RESOURCE_BUNDLE.getString("message.label.added"), label.getId(), label.getTitle())
                ));
            } else {
                out.println(title);
            }
        } else {
            if (!plainView) {
                out.println(SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("message.label.already_exists"), title)));
            } else {
                out.println(String.format(RESOURCE_BUNDLE.getString("message.label_already_exists"), title));
            }
        }
    }
}
