package com.crowdin.cli.client;

import com.crowdin.client.screenshots.model.AddScreenshotRequest;
import com.crowdin.client.screenshots.model.Screenshot;
import com.crowdin.client.screenshots.model.UpdateScreenshotRequest;

import java.util.List;

public interface ClientScreenshot extends Client {

    List<Screenshot> listScreenshots(Long stringId);

    Screenshot getScreenshot(Long id);

    Screenshot uploadScreenshot(AddScreenshotRequest request) throws ResponseException;

    Screenshot updateScreenshot(Long screenshotId, UpdateScreenshotRequest request);

    void deleteScreenshot(Long id);
}
