package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientScreenshot;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

import static java.util.Objects.nonNull;

@CommandLine.Command(
    name = CommandNames.SCREENSHOT_UPLOAD,
    sortOptions = false
)
class ScreenshotUploadSubcommand extends ActCommandScreenshot{

    @CommandLine.Parameters(descriptionKey = "crowdin.screenshot.upload.file")
    protected File file;

    @CommandLine.Option(names = {"--auto-tag"}, negatable = true, descriptionKey = "crowdin.screenshot.upload.auto-tag", order = -2)
    protected boolean autoTag;

    @CommandLine.Option(names = {"-f", "--file"}, paramLabel = "...", descriptionKey = "crowdin.screenshot.upload.file-path", order = -2)
    protected String filePath;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", descriptionKey = "crowdin.screenshot.upload.branch-name", order = -2)
    protected String branchName;

    @CommandLine.Option(names = {"--label"}, paramLabel = "...", descriptionKey = "params.label", order = -2)
    protected List<String> labelNames;

    @CommandLine.Option(names = {"-d", "--directory"}, paramLabel = "...", descriptionKey = "crowdin.screenshot.upload.directory-path", order = -2)
    protected String directoryPath;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ClientScreenshot> getAction(Actions actions) {
        Outputter out = new PicocliOutputter(System.out, isAnsi());
        ProjectClient projectClient = this.getProjectClient(this.getProperties(propertiesBuilders, out));
        return actions.screenshotUpload(file, branchName, labelNames, directoryPath, filePath, autoTag, plainView, this.noProgress, projectClient);
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        String extension = FilenameUtils.getExtension(file.getName());
        if (!equalsAny(extension, "jpeg", "jpg", "png", "gif")) {
            errors.add(RESOURCE_BUNDLE.getString("error.screenshot.wrong_format"));
        }
        if (nonNull(filePath) && !autoTag) {
            errors.add(RESOURCE_BUNDLE.getString("error.screenshot.auto-tag_required_for_file"));
        }
        if (nonNull(branchName) && !autoTag) {
            errors.add(RESOURCE_BUNDLE.getString("error.screenshot.auto-tag_required_for_branch"));
        }
        if (nonNull(directoryPath) && !autoTag) {
            errors.add(RESOURCE_BUNDLE.getString("error.screenshot.auto-tag_required_for_directory"));
        }
        if (nonNull(filePath) && (nonNull(directoryPath) || nonNull(branchName)) || nonNull(directoryPath) && nonNull(branchName)) {
            errors.add(RESOURCE_BUNDLE.getString("error.screenshot.only_one_allowed"));
        }
        return errors;
    }

    private boolean equalsAny(String toCheck, String... strings) {
        for (String string : strings) {
            if (StringUtils.equalsIgnoreCase(toCheck, string)) {
                return true;
            }
        }
        return false;
    }
}
