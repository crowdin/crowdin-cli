package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.projectsgroups.model.Project;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.screenshots.model.Screenshot;
import lombok.AllArgsConstructor;

import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

@AllArgsConstructor
class ProjectListAction implements NewAction<ProjectProperties, ProjectClient> {

    private final boolean isVerbose;

    @Override
    public void act(Outputter out, ProjectProperties properties, ProjectClient client) {
        List<? extends Project> projects = client.listProjects();
        for (Project project : projects) {
            if (!isVerbose) {
                out.println(String.format(RESOURCE_BUNDLE.getString("message.project.list"), project.getId(), project.getName()));
            } else {
                String lastActivity = DateTimeFormatter.ISO_DATE_TIME.format(project.getLastActivity().toInstant().atOffset(ZoneOffset.UTC));
                String visibility = Optional.ofNullable(project.getVisibility()).orElse("private"); //for enterprise, we don't receive this field so set "private" as default
                String type = Optional.ofNullable(project.getType()).filter(t -> t == Type.STRINGS_BASED).map(t -> "string-based").orElse("file-based");
                out.println(String.format(RESOURCE_BUNDLE.getString("message.project.list.verbose"), project.getId(), project.getName(), type, visibility, lastActivity));
            }
        }
    }
}
