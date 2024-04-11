package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;
import picocli.CommandLine.Option;
import picocli.CommandLine.Parameters;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@CommandLine.Command(
    name = CommandNames.FILE_UPLOAD,
    sortOptions = false
)
class FileUploadSubcommand extends ActCommandProject {

    @Parameters(descriptionKey = "crowdin.file.upload.file")
    protected File file;

    @Option(names = {"-b", "--branch"}, paramLabel = "...", order = -2)
    protected String branch;

    @Option(names = {"--no-auto-update"}, descriptionKey = "crowdin.file.upload.auto-update", negatable = true, order = -2)
    protected boolean autoUpdate = true;

    @Option(names = {"--label"}, descriptionKey = "params.label", paramLabel = "...", order = -2)
    protected List<String> labels;

    @Option(names = {"-d", "--dest"}, paramLabel = "...", descriptionKey = "crowdin.file.upload.dest", order = -2)
    protected String destination;

    @Option(names = {"--type"}, descriptionKey = "crowdin.file.upload.type", paramLabel = "...", order = -2)
    protected String type;

    @Option(names = {"--parser-version"}, descriptionKey = "crowdin.file.upload.parser", paramLabel = "...", order = -2)
    protected Integer parserVersion;

    @Option(names = {"--excluded-language"}, descriptionKey = "params.excluded-languages", paramLabel = "...", order = -2)
    protected List<String> excludedLanguages;

    @Option(names = {"--cleanup-mode"}, negatable = true, descriptionKey = "crowdin.file.upload.cleanup-mode", order = -2)
    protected boolean cleanupMode = false;

    @Option(names = {"--update-strings"}, negatable = true, descriptionKey = "crowdin.file.upload.update-strings", order = -2)
    protected boolean updateStrings = false;

    @Option(names = {"-l", "--language"}, paramLabel = "...", descriptionKey = "crowdin.file.language", order = -2)
    protected String languageId;

    @Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (parserVersion != null && type == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.file.type_required"));
        }
        return errors;
    }

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        if (Objects.nonNull(languageId)) {
            return actions.fileUploadTranslation(file, branch, destination, languageId, plainView);
        }
        return actions.fileUpload(file, branch, autoUpdate, labels, destination, type, parserVersion, excludedLanguages, plainView, cleanupMode, updateStrings);
    }
}
