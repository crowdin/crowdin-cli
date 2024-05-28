package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientTm;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.client.translationmemory.model.AddTranslationMemoryRequest;
import com.crowdin.client.translationmemory.model.TranslationMemory;
import lombok.AllArgsConstructor;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Map;

import static com.crowdin.cli.BaseCli.DEFAULT_TM_NAME;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@AllArgsConstructor
class TmUploadAction implements NewAction<BaseProperties, ClientTm> {

    private final File file;
    private final Long id;
    private final String languageId;
    private final Map<String, Integer> scheme;
    private final Boolean firstLineContainsHeader;
    private final boolean plainView;

    @Override
    public void act(Outputter out, BaseProperties pb, ClientTm client) {
        boolean isOrganization = PropertiesBeanUtils.isOrganization(pb.getBaseUrl());
        TranslationMemory targetTm = this.getTm(client, isOrganization);
        Long storageId;
        try (InputStream fileStream = new FileInputStream(file)) {
            storageId = client.uploadStorage(file.getName(), fileStream);
        } catch (Exception e) {
            throw ExitCodeExceptionMapper.remap(e, RESOURCE_BUNDLE.getString("error.upload_to_storage"));
        }
        client.importTm(targetTm.getId(), RequestBuilder.importTranslationMemory(storageId, scheme, firstLineContainsHeader));
        if (!plainView) {
            out.println(OK.withIcon(
                String.format(RESOURCE_BUNDLE.getString("message.tm.import_success"), targetTm.getId(), targetTm.getName())));
        } else {
            out.println(targetTm.getId().toString());
        }
    }

    private TranslationMemory getTm(ClientTm client, boolean isEnterprise) {
        if (id != null) {
            return client.getTm(id);
        } else {
            AddTranslationMemoryRequest addTmRequest = (isEnterprise)
                ? RequestBuilder.addTmEnterprise(String.format(DEFAULT_TM_NAME, file.getName()), languageId, 0L)
                : RequestBuilder.addTm(String.format(DEFAULT_TM_NAME, file.getName()), languageId);
            return client.addTm(addTmRequest);
        }
    }
}
