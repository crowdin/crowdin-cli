package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.client.glossaries.model.Glossary;
import lombok.NonNull;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.DEFAULT_GLOSSARY_NAME;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class GlossaryUploadAction implements ClientAction {

    private final java.io.File file;
    private final Long id;
    private final String name;
    private final Map<String, Integer> scheme;

    public GlossaryUploadAction(@NonNull java.io.File file, Long id, String name, Map<String, Integer> scheme) {
        this.file = file;
        this.id = id;
        this.name = name;
        this.scheme = scheme;
    }

    @Override
    public void act(Outputter out, PropertiesBean pb, Client client) {
        Glossary targetGlossary = null;
        if (id != null) {
            targetGlossary = client.getGlossary(id)
                .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.glossary.not_found_by_id")));
        } else if (name != null) {
            List<Glossary> foundGlossaries = client.listGlossaries().stream()
                .filter(gl -> gl.getName() != null && gl.getName().equals(name))
                .collect(Collectors.toList());
            if (foundGlossaries.isEmpty()) {
                targetGlossary = client.addGlossary(RequestBuilder.addGlossary(name));
            } else if (foundGlossaries.size() == 1) {
                targetGlossary = foundGlossaries.get(0);
            } else {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.glossary.more_than_one_glossary_by_that_name"));
            }
        } else {
            targetGlossary = client.addGlossary(
                RequestBuilder.addGlossary(String.format(DEFAULT_GLOSSARY_NAME, file.getName())));
        }
        Long storageId;
        try (InputStream fileStream = new FileInputStream(file)) {
            storageId = client.uploadStorage(file.getName(), fileStream);
        } catch (IOException e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.upload_to_storage"), e);
        }
        client.importGlossary(targetGlossary.getId(), RequestBuilder.importGlossary(storageId, scheme));
        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.glossary.import_success"), targetGlossary.getId(), targetGlossary.getName())));
    }
}
