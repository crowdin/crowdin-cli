package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;
import picocli.CommandLine.Option;
import picocli.CommandLine.Parameters;

import java.io.File;
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
    private String destination;

    @Option(names = {"--excluded-language"}, descriptionKey = "params.excluded-languages", paramLabel = "...", order = -2)
    protected List<String> excludedLanguages;

    @Option(names = {"--no-cleanup-mode"}, negatable = true, descriptionKey = "crowdin.file.upload.cleanup-mode", order = -2)
    protected boolean cleanupMode = true;

    @Option(names = {"--no-update-strings"}, negatable = true, descriptionKey = "crowdin.file.upload.update-strings", order = -2)
    protected boolean updateStrings = true;

    @Option(names = {"-l", "--language"}, paramLabel = "...", descriptionKey = "crowdin.file.language", order = -2)
    protected String languageId;

    @Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        if (Objects.nonNull(languageId)) {
            return actions.fileUploadTranslation(file, branch, destination, languageId, plainView);
        }
        return actions.fileUpload(file, branch, autoUpdate, labels, destination, excludedLanguages, plainView, cleanupMode, updateStrings);
    }
}
