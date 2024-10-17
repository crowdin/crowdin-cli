package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.projectsgroups.model.AddProjectRequest;
import com.crowdin.client.projectsgroups.model.Project;
import com.crowdin.client.projectsgroups.model.Visibility;
import lombok.AllArgsConstructor;

import java.util.List;
import java.util.Objects;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

@AllArgsConstructor
class ProjectAddAction implements NewAction<ProjectProperties, ProjectClient> {

    private final String name;
    private final boolean isStringBased;
    private final String sourceLanguage;
    private final List<String> languages;
    private final boolean isPublic;
    private final boolean plainView;

    @Override
    public void act(Outputter out, ProjectProperties properties, ProjectClient client) {
        boolean isOrganization = PropertiesBeanUtils.isOrganization(properties.getBaseUrl());
        String sourceLang = Objects.nonNull(sourceLanguage) ? sourceLanguage : "en";
        Visibility visibility = isPublic ? Visibility.OPEN : Visibility.PRIVATE;
        AddProjectRequest request = RequestBuilder.addProject(name, isStringBased, sourceLang, languages, visibility, isOrganization);
        Project project = client.addProject(request);
        if (!plainView) {
            out.println(ExecutionStatus.OK.withIcon(
                String.format(RESOURCE_BUNDLE.getString("message.project.list"), project.getId(), project.getName())
            ));
        } else {
            out.println(project.getName());
        }
    }
}
