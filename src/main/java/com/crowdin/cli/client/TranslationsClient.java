package com.crowdin.cli.client;

import com.crowdin.client.api.TranslationsApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.models.FileRaw;
import com.crowdin.common.models.Translation;
import com.crowdin.common.request.BuildTranslationPayload;
import com.crowdin.common.request.TranslationPayload;
import com.crowdin.common.response.SimpleResponse;
import com.crowdin.util.ResponseUtil;
import com.fasterxml.jackson.core.type.TypeReference;

import javax.ws.rs.core.Response;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

public class TranslationsClient extends Client {

    private String projectId;
    TranslationsApi api;

    public TranslationsClient(Settings settings, String projectId) {
        super(settings);
        this.projectId = projectId;
        api = new TranslationsApi(this.settings);
    }

    public Translation startBuildingTranslation(Optional<Long> branchId, String targetLanguageId) {

        BuildTranslationPayload buildTranslation = new BuildTranslationPayload();
        branchId.ifPresent(buildTranslation::setBranchId);
        buildTranslation.setTargetLanguageIds(Collections.singletonList(targetLanguageId));

        Response response = api.buildTranslation(this.projectId, buildTranslation).execute();
        return ResponseUtil.getResponceBody(response, new TypeReference<SimpleResponse<Translation>>() {}).getEntity();
    }

    public Translation checkBuildingStatus(String buildId) {
        return api
            .getTranslationInfo(this.projectId.toString(), buildId).getResponseEntity().getEntity();
    }

    public void uploadTranslations(
        String languageId,
        TranslationPayload translationPayload
    ) {
        Response response = api.uploadTranslation(projectId, languageId, translationPayload).execute();
    }

    public FileRaw getFileRaw(String buildId) {
        Response response = api.getTranslationRaw(this.projectId, buildId).execute();
        return ResponseUtil.getResponceBody(response, new TypeReference<SimpleResponse<FileRaw>>() {}).getEntity();
    }


}
