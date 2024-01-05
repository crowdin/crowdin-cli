package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;
import picocli.CommandLine.Parameters;

import java.io.File;
import java.util.List;

@Command(
    name = CommandNames.FILE_DOWNLOAD,
    sortOptions = false
)
class FileDownloadSubcommand extends ActCommandProject {

    @Parameters(descriptionKey = "crowdin.file.upload.file")
    protected String file;

    @Option(names = {"-l", "--language"}, paramLabel = "...", order = -2)
    protected List<String> languageIds;

    @Option(names = {"--dest"}, paramLabel = "...", descriptionKey = "crowdin.file.dest")
    private String destination;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.fileDownload(file, languageIds, destination);
    }
}
