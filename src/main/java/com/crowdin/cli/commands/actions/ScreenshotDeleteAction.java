package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientScreenshot;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.screenshots.model.Screenshot;

import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

class ScreenshotDeleteAction implements NewAction<ProjectProperties, ClientScreenshot> {

    private final String name;

    public ScreenshotDeleteAction(String name) {
        this.name = name;
    }

    @Override
    public void act(Outputter out, ProjectProperties properties, ClientScreenshot client) {
        Map<String, Long> screenshots = client.listScreenshots(null).stream()
            .collect(Collectors.toMap(Screenshot::getName, Screenshot::getId));
        if (!screenshots.containsKey(name)) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.screenshot.not_found"), name));
        }
        client.deleteScreenshot(screenshots.get(name));
        out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.screenshot.deleted"), name)));
    }
}
