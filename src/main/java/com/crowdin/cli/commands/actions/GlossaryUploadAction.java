package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientGlossary;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.client.glossaries.model.AddGlossaryRequest;
import com.crowdin.client.glossaries.model.Glossary;
import lombok.NonNull;
import org.apache.commons.lang3.StringUtils;

import java.io.FileInputStream;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.DEFAULT_GLOSSARY_NAME;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class GlossaryUploadAction implements NewAction<BaseProperties, ClientGlossary> {

    private final java.io.File file;
    private final Long id;
    private final String name;
    private final String languageId;
    private final Map<String, Integer> scheme;
    private final Boolean firstLineContainsHeader;

    public GlossaryUploadAction(@NonNull java.io.File file, Long id, String name, String languageId, Map<String, Integer> scheme, Boolean firstLineContainsHeader) {
        this.file = file;
        this.id = id;
        this.name = name;
        this.languageId = languageId;
        this.scheme = scheme;
        this.firstLineContainsHeader = firstLineContainsHeader;
    }

    @Override
    public void act(Outputter out, BaseProperties pb, ClientGlossary client) {
        boolean isOrganization = PropertiesBeanUtils.isOrganization(pb.getBaseUrl());
        Glossary targetGlossary;
        if (id != null) {
            targetGlossary = client.getGlossary(id)
                .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.glossary.not_found_by_id")));
        } else if (name != null) {
            List<Glossary> foundGlossaries = client.listGlossaries().stream()
                .filter(gl -> gl.getName() != null && gl.getName().equals(name))
                .collect(Collectors.toList());
            if (foundGlossaries.isEmpty()) {
                if (StringUtils.isEmpty(languageId)) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.glossary.no_language_id"));
                }
                targetGlossary = client.addGlossary(RequestBuilder.addGlossary(name, languageId));
            } else if (foundGlossaries.size() == 1) {
                targetGlossary = foundGlossaries.get(0);
            } else {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.glossary.more_than_one_glossary_by_that_name"));
            }
        } else {
            AddGlossaryRequest addGlossaryRequest = (isOrganization)
                ? RequestBuilder.addGlossaryEnterprise(String.format(DEFAULT_GLOSSARY_NAME, file.getName()), languageId, 0L)
                : RequestBuilder.addGlossary(String.format(DEFAULT_GLOSSARY_NAME, file.getName()), languageId);
            targetGlossary = client.addGlossary(addGlossaryRequest);
        }
        Long storageId;
        try (InputStream fileStream = new FileInputStream(file)) {
            storageId = client.uploadStorage(file.getName(), fileStream);
        } catch (Exception e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.upload_to_storage"), e);
        }
        client.importGlossary(targetGlossary.getId(), RequestBuilder.importGlossary(storageId, scheme, firstLineContainsHeader));
        out.println(OK.withIcon(
            String.format(RESOURCE_BUNDLE.getString("message.glossary.import_success"), targetGlossary.getId(), targetGlossary.getName())));
    }
}
