package com.crowdin.cli.client;

import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.exceptions.StorageNotFoundResponseException;
import com.crowdin.client.api.TranslationsApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.FileRaw;
import com.crowdin.common.models.Translation;
import com.crowdin.common.request.BuildTranslationPayload;
import com.crowdin.common.request.TranslationPayload;
import org.apache.commons.lang3.StringUtils;

import java.util.Collections;
import java.util.Optional;

public class TranslationsClient extends Client {

    private String projectId;
    TranslationsApi api;

    public TranslationsClient(Settings settings, String projectId) {
        super(settings);
        this.projectId = projectId;
        api = new TranslationsApi(this.settings);
    }

    public Translation startBuildingTranslation(BuildTranslationPayload buildTranslationPayload) {
        return execute(api.buildTranslation(this.projectId, buildTranslationPayload));
    }

    public Translation checkBuildingStatus(String buildId) {
        return execute(api.getTranslationInfo(this.projectId.toString(), buildId));
    }

    public void uploadTranslations(String languageId, TranslationPayload translationPayload) throws ResponseException {
        try {
            execute(api.uploadTranslation(projectId, languageId, translationPayload));
        } catch (Exception e) {
            if (StringUtils.contains(e.getMessage(), "File from storage with id #" + translationPayload.getStorageId() + " was not found")) {
                throw new StorageNotFoundResponseException();
            } else {
                throw new ResponseException(e.getMessage());
            }
        }
    }

    public FileRaw getFileRaw(String buildId) {
        return execute(api.getTranslationRaw(this.projectId, buildId));
    }


}
