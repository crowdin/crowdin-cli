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
        name = CommandNames.BUNDLE_ADD
)
class BundleAddSubcommand extends ActCommandBundle {

    @CommandLine.Parameters(descriptionKey = "crowdin.bundle.add.name")
    protected String name;

    @CommandLine.Option(names = {"--format"}, paramLabel = "...", descriptionKey = "crowdin.bundle.add.format")
    protected String format;

    @CommandLine.Option(names = {"--source"}, paramLabel = "...", descriptionKey = "crowdin.bundle.add.source")
    protected List<String> source;

    @CommandLine.Option(names = {"--ignore"}, paramLabel = "...", descriptionKey = "crowdin.bundle.add.ignore")
    protected List<String> ignore;

    @CommandLine.Option(names = {"--translation"}, paramLabel = "...", descriptionKey = "crowdin.bundle.add.translation")
    protected String translation;

    @CommandLine.Option(names = {"--multilingual"}, paramLabel = "...", negatable = true, descriptionKey = "crowdin.bundle.add.multilingual")
    protected boolean multilingual;

    @CommandLine.Option(names = {"--label"}, paramLabel = "...", descriptionKey = "crowdin.bundle.add.label")
    protected List<Long> labels;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected final boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }

    @Override
    protected NewAction<ProjectProperties, ClientBundle> getAction(Actions actions) {
        return actions.bundleAdd(name, format, source, ignore, translation, multilingual, labels, plainView);
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (Strings.isEmpty(name)) {
            errors.add(RESOURCE_BUNDLE.getString("error.bundle.empty_name"));
        }
        if (Strings.isEmpty(format)) {
            errors.add(RESOURCE_BUNDLE.getString("error.bundle.empty_format"));
        }
        if (source == null || source.isEmpty()) {
            errors.add(RESOURCE_BUNDLE.getString("error.bundle.empty_source"));
        }
        if (Strings.isEmpty(translation)) {
            errors.add(RESOURCE_BUNDLE.getString("error.bundle.empty_translation"));
        }
        return errors;
    }

}
