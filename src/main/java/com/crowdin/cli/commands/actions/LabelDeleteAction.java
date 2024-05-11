package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientLabel;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.labels.model.Label;
import lombok.AllArgsConstructor;

import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

@AllArgsConstructor
class LabelDeleteAction implements NewAction<ProjectProperties, ClientLabel> {

    private final String title;

    @Override
    public void act(Outputter out, ProjectProperties properties, ClientLabel client) {
        Map<String, Long> labels = client.listLabels().stream()
            .collect(Collectors.toMap(Label::getTitle, Label::getId));
        if (!labels.containsKey(title)) {
            throw new ExitCodeExceptionMapper.NotFoundException(RESOURCE_BUNDLE.getString("error.label.not_found"));
        }
        client.deleteLabel(labels.get(title));
        out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.label.deleted"), title)));
    }
}
