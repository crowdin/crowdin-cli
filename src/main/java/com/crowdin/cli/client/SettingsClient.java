package com.crowdin.cli.client;

import com.crowdin.client.api.SettingsApi;
import com.crowdin.common.Settings;
import com.crowdin.common.response.SimpleResponse;
import com.crowdin.util.ResponseUtil;
import com.fasterxml.jackson.core.type.TypeReference;

import javax.ws.rs.core.Response;
import java.util.Optional;

public class SettingsClient extends Client {

    public SettingsClient(Settings settings) {
        super(settings);
    }

    public Optional<String> getJiptPseudoLanguageId(String projectId) {
        SettingsApi settingsApi = new SettingsApi(this.settings);
        Response response = settingsApi.getSettings(projectId).execute();
        com.crowdin.common.models.Settings settingsResponse =
                ResponseUtil.getResponceBody(response, new TypeReference<SimpleResponse<com.crowdin.common.models.Settings>>() {}).getEntity();
        return (settingsResponse.isInContext()) ? Optional.of(settingsResponse.getJiptPseudoLanguageId()) : Optional.empty();
    }

}
