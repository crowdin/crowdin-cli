package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientScreenshot;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.screenshots.model.Screenshot;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

class ScreenshotDeleteAction implements NewAction<ProjectProperties, ClientScreenshot> {

    private final Long id;

    public ScreenshotDeleteAction(Long id) {
        this.id = id;
    }

    @Override
    public void act(Outputter out, ProjectProperties properties, ClientScreenshot client) {
        Screenshot screenshot = client.getScreenshot(id);
        if (screenshot != null) {
            client.deleteScreenshot(id);
            out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.screenshot.deleted"), id, screenshot.getName())));
        }
    }
}
