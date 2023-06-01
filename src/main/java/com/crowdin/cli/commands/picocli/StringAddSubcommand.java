package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.Utils;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
    sortOptions = false,
    name = CommandNames.STRING_ADD
)
class StringAddSubcommand extends ActCommandProject {

    @CommandLine.Parameters(descriptionKey = "crowdin.string.add.text")
    protected String text;

    @CommandLine.Option(names = {"--identifier"}, paramLabel = "...", order = -2)
    protected String identifier;

    @CommandLine.Option(names = {"--max-length"}, paramLabel = "...", order = -2)
    protected Integer maxLength;

    @CommandLine.Option(names = {"--context"}, paramLabel = "...", order = -2)
    protected String context;

    @CommandLine.Option(names = {"--file"}, paramLabel = "...", order = -2)
    protected List<String> files;

    @CommandLine.Option(names = {"--label"}, descriptionKey = "params.label", paramLabel = "...", order = -2)
    protected List<String> labelNames;

    @CommandLine.Option(names = {"--hidden"}, order = -2)
    protected Boolean isHidden;

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (maxLength != null && maxLength < 0) {
            errors.add("'--max-length' cannot be lower than 0");
        }
        if (files != null) {
            for (int i = 0; i < files.size(); i++) {
                String normalizedFile = StringUtils.removeStart(Utils.normalizePath(files.get(i)), Utils.PATH_SEPARATOR);
                files.set(i, normalizedFile);
            }
        }
        return errors;
    }

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.stringAdd(noProgress, text, identifier, maxLength, context, files, labelNames, isHidden);
    }
}
