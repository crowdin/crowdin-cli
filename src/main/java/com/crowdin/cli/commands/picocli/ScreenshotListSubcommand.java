package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientScreenshot;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
    sortOptions = false,
    name = CommandNames.SCREENSHOT_LIST
)
class ScreenshotListSubcommand extends ActCommandScreenshot {

    @CommandLine.Option(names = {"--string-id"}, paramLabel = "...", descriptionKey = "crowdin.screenshot.list.string-id", order = -2)
    private Long stringId;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ClientScreenshot> getAction(Actions actions) {
        return actions.screenshotList(this.stringId, this.plainView);
    }
}
