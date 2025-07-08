package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import org.apache.logging.log4j.util.Strings;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
        name = CommandNames.CLONE,
        sortOptions = false
)
class BundleCloneSubcommand extends ActCommandBundle {

    @CommandLine.Parameters(descriptionKey = "crowdin.bundle.clone.id")
    protected Long id;

    @CommandLine.Option(names = {"--name"}, paramLabel = "...", descriptionKey = "crowdin.bundle.add.name", order = -2)
    protected String name;

    @CommandLine.Option(names = {"--format"}, paramLabel = "...", descriptionKey = "crowdin.bundle.add.format", order = -2)
    protected String format;

    @CommandLine.Option(names = {"--source"}, paramLabel = "...", descriptionKey = "crowdin.bundle.add.source", order = -2)
    protected List<String> source;

    @CommandLine.Option(names = {"--ignore"}, paramLabel = "...", descriptionKey = "crowdin.bundle.add.ignore", order = -2)
    protected List<String> ignore;

    @CommandLine.Option(names = {"--translation"}, paramLabel = "...", descriptionKey = "crowdin.bundle.add.translation", order = -2)
    protected String translation;

    @CommandLine.Option(names = {"--label"}, paramLabel = "...", descriptionKey = "crowdin.bundle.add.label", order = -2)
    protected List<Long> labels;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @CommandLine.Option(names = {"--include-source-language"}, paramLabel = "...", descriptionKey = "crowdin.bundle.add.includeProjectSourceLanguage", order = -2)
    protected Boolean includeProjectSourceLanguage;

    @CommandLine.Option(names = {"--include-pseudo-language"}, paramLabel = "...", descriptionKey = "crowdin.bundle.add.includePseudoLanguage", order = -2)
    protected Boolean includePseudoLanguage;

    @CommandLine.Option(names = {"--multilingual"}, paramLabel = "...", descriptionKey = "crowdin.bundle.add.isMultilingual", order = -2)
    protected Boolean isMultilingual;

    @Override
    protected final boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }

    @Override
    protected NewAction<ProjectProperties, ClientBundle> getAction(Actions actions) {
        return actions.bundleClone(id, name, format, source, ignore, translation, labels, plainView, includeProjectSourceLanguage, includePseudoLanguage, isMultilingual);
    }
}
