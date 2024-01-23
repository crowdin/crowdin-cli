package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;
import picocli.CommandLine.Parameters;

import java.util.Objects;

@Command(
    name = CommandNames.FILE_DOWNLOAD,
    sortOptions = false
)
class FileDownloadSubcommand extends ActCommandProject {

    @Parameters(descriptionKey = "crowdin.file.download.file")
    protected String file;

    @Option(names = {"-l", "--language"}, paramLabel = "...", descriptionKey = "crowdin.file.language", order = -2)
    protected String languageId;

    @Option(names = {"-b", "--branch"}, paramLabel = "...", order = -2)
    protected String branch;

    @Option(names = {"-d", "--dest"}, paramLabel = "...", descriptionKey = "crowdin.file.download.dest", order = -2)
    private String destination;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        if (Objects.nonNull(languageId))
            return actions.fileDownloadTranslation(file, languageId, branch, destination);
        return actions.fileDownload(file, branch, destination);
    }
}
