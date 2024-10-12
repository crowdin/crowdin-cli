package com.crowdin.cli.client;

import com.crowdin.client.screenshots.model.*;

import java.util.List;

public interface ClientScreenshot extends Client {

    List<Screenshot> listScreenshots(Long stringId);

    List<Screenshot> listScreenshotsByName(String fileName);

    Screenshot getScreenshot(Long id);

    Screenshot uploadScreenshot(AddScreenshotRequest request) throws ResponseException;

    Screenshot updateScreenshot(Long screenshotId, UpdateScreenshotRequest request);

    void deleteScreenshot(Long id);

    void replaceTags(Long screenshotId, AutoTagReplaceTagsRequest request);
}
