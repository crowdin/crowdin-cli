package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;
import picocli.CommandLine.Parameters;

import java.util.List;

@Command(
    name = CommandNames.ADD,
    sortOptions = false
)
class ProjectAddSubcommand extends ActCommandProject {

    @Parameters(descriptionKey = "crowdin.project.add.name")
    protected String name;

    @Option(names = {"--string-based"}, order = -2, descriptionKey = "crowdin.project.add.string-based")
    protected boolean isStringBased = false;

    @Option(names = {"--source-language"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.project.add.source-language")
    protected String sourceLanguage;

    @Option(names = {"-l", "--language"}, required = true, paramLabel = "...", order = -2, descriptionKey = "crowdin.project.add.language")
    protected List<String> languages;

    @Option(names = {"--public"}, order = -2, descriptionKey = "crowdin.project.add.public")
    protected boolean isPublic = false;

    @Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.projectAdd(this.name, this.isStringBased, this.sourceLanguage, this.languages, this.isPublic, this.plainView);
    }
}
