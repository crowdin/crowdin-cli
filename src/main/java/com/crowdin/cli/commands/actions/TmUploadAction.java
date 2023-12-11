package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientTm;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.client.translationmemory.model.AddTranslationMemoryRequest;
import com.crowdin.client.translationmemory.model.TranslationMemory;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.DEFAULT_TM_NAME;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class TmUploadAction implements NewAction<BaseProperties, ClientTm> {

    private final File file;
    private final Long id;
    private final String name;
    private final String languageId;
    private final Map<String, Integer> scheme;
    private final Boolean firstLineContainsHeader;

    public TmUploadAction(File file, Long id, String name, String languageId, Map<String, Integer> scheme, Boolean firstLineContainsHeader) {
        this.file = file;
        this.id = id;
        this.name = name;
        this.languageId = languageId;
        this.scheme = scheme;
        this.firstLineContainsHeader = firstLineContainsHeader;
    }

    @Override
    public void act(Outputter out, BaseProperties pb, ClientTm client) {
        boolean isOrganization = PropertiesBeanUtils.isOrganization(pb.getBaseUrl());
        TranslationMemory targetTm = this.getTm(client, isOrganization);
        Long storageId;
        try (InputStream fileStream = new FileInputStream(file)) {
            storageId = client.uploadStorage(file.getName(), fileStream);
        } catch (Exception e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.upload_to_storage"), e);
        }
        client.importTm(targetTm.getId(), RequestBuilder.importTranslationMemory(storageId, scheme, firstLineContainsHeader));
        out.println(OK.withIcon(
            String.format(RESOURCE_BUNDLE.getString("message.tm.import_success"), targetTm.getId(), targetTm.getName())));
    }

    private TranslationMemory getTm(ClientTm client, boolean isEnterprise) {
        if (id != null) {
            return client.getTm(id)
                .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.tm.not_found_by_id")));
        } else if (name != null) {
            List<TranslationMemory> foundTms = client.listTms().stream()
                .filter(gl -> gl.getName() != null && gl.getName().equals(name))
                .collect(Collectors.toList());
            if (foundTms.isEmpty()) {
                if (StringUtils.isEmpty(languageId)) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.tm.no_language_id"));
                }
                return client.addTm(RequestBuilder.addTm(name, languageId));
            } else if (foundTms.size() == 1) {
                return foundTms.get(0);
            } else {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.tm.more_than_one_tm_by_that_name"));
            }
        } else {
            AddTranslationMemoryRequest addTmRequest = (isEnterprise)
                ? RequestBuilder.addTmEnterprise(String.format(DEFAULT_TM_NAME, file.getName()), languageId, 0L)
                : RequestBuilder.addTm(String.format(DEFAULT_TM_NAME, file.getName()), languageId);
            return client.addTm(addTmRequest);
        }
    }
}
