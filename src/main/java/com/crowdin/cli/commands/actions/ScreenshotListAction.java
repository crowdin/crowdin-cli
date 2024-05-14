package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientScreenshot;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.screenshots.model.Screenshot;

import java.util.List;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class ScreenshotListAction implements NewAction<ProjectProperties, ClientScreenshot> {

    private final Long stringId;
    private final boolean plainView;

    public ScreenshotListAction(Long stringId, boolean plainView) {
        this.stringId = stringId;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, ProjectProperties properties, ClientScreenshot client) {
        List<Screenshot> screenshots = client.listScreenshots(stringId);
        for (Screenshot screenshot : screenshots) {
            if (!plainView) {
                out.println(String.format(RESOURCE_BUNDLE.getString("message.screenshot.list"),
                    screenshot.getId(), screenshot.getTagsCount(), screenshot.getName()));
            } else {
                out.println(String.format("%d %s", screenshot.getId(), screenshot.getName()));
            }
        }
        if (screenshots.isEmpty()) {
            if (!plainView) {
                out.println(OK.withIcon(RESOURCE_BUNDLE.getString("message.screenshot.list_empty")));
            } else {
                out.println(RESOURCE_BUNDLE.getString("message.screenshot.list_empty"));
            }
        }
    }
}
