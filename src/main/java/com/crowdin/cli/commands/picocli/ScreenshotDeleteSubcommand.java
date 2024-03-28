package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientScreenshot;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.SCREENSHOT_DELETE
)
class ScreenshotDeleteSubcommand extends ActCommandScreenshot {

    @CommandLine.Parameters(descriptionKey = "crowdin.screenshot.delete.id")
    protected Long id;

    @Override
    protected NewAction<ProjectProperties, ClientScreenshot> getAction(Actions actions) {
        return actions.screenshotDelete(id);
    }
}
