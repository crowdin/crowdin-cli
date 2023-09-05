package com.crowdin.cli.client;

import com.crowdin.client.Client;
import com.crowdin.client.screenshots.model.AddScreenshotRequest;
import com.crowdin.client.screenshots.model.Screenshot;
import com.crowdin.client.screenshots.model.UpdateScreenshotRequest;
import lombok.AllArgsConstructor;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiPredicate;

import static java.lang.Long.parseLong;

@AllArgsConstructor
public class CrowdinClientScreenshot extends CrowdinClientCore implements ClientScreenshot {

    private final Client client;
    private final String projectId;

    @Override
    public List<Screenshot> listScreenshots(Long stringId) {
        return executeRequestFullList((limit, offset) -> this.client.getScreenshotsApi()
            .listScreenshots(parseLong(this.projectId), stringId, limit, offset));
    }

    @Override
    public Screenshot uploadScreenshot(AddScreenshotRequest request) throws ResponseException {
        Map<BiPredicate<String, String>, ResponseException> errorHandler = new LinkedHashMap<BiPredicate<String, String>, ResponseException>() {{
            put((code, message) -> code.equals("409") && message.contains("Auto tag is currently in progress"),
                new AutoTagInProgressException());
        }};
        return executeRequest(errorHandler, () -> this.client.getScreenshotsApi()
            .addScreenshot(parseLong(this.projectId), request)
            .getData());
    }

    @Override
    public Screenshot updateScreenshot(Long screenshotId, UpdateScreenshotRequest request) {
        return executeRequest(() -> this.client.getScreenshotsApi()
            .updateScreenshot(parseLong(this.projectId), screenshotId, request)
            .getData());
    }

    @Override
    public void deleteScreenshot(Long id) {
        executeRequest(() -> {
            this.client.getScreenshotsApi().deleteScreenshot(parseLong(this.projectId), id);
            return null;
        });
    }
}
