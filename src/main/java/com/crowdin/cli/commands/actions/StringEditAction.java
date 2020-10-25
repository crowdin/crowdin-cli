package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.client.core.model.PatchOperation;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.sourcestrings.model.SourceString;

import java.util.ArrayList;
import java.util.List;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class StringEditAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private final boolean noProgress;
    private final Long id;
    private final String identifier;
    private final String newText;
    private final String newContext;
    private final Integer newMaxLength;
    private final Boolean isHidden;

    public StringEditAction(
        boolean noProgress, Long id, String identifier, String newText, String newContext, Integer newMaxLength, Boolean isHidden
    ) {
        this.noProgress = noProgress;
        this.id = id;
        this.identifier = identifier;
        this.newText = newText;
        this.newContext = newContext;
        this.newMaxLength = newMaxLength;
        this.isHidden = isHidden;
    }

    @Override
    public void act(Outputter out, PropertiesWithFiles pb, ProjectClient client) {

        List<SourceString> sourceStrings = client.listSourceString(null, null);

        Long foundStringId;
        if (id != null) {
            foundStringId = sourceStrings.stream()
                .filter(ss -> id.equals(ss.getId()))
                .findAny()
                .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.source_string_not_found")))
                .getId();
        } else if (identifier != null) {
            foundStringId = sourceStrings.stream()
                .filter(ss -> identifier.equals(ss.getIdentifier()))
                .findAny()
                .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.source_string_not_found")))
                .getId();
        } else {
            throw new RuntimeException("Unexpected error: no 'id' or 'identifier' specified");
        }

        List<PatchRequest> requests = new ArrayList<>();
        if (newText != null) {
            PatchRequest request = RequestBuilder.patch(newText, PatchOperation.REPLACE, "/text");
            requests.add(request);
        }
        if (newContext != null) {
            PatchRequest request = RequestBuilder.patch(newContext, PatchOperation.REPLACE, "/context");
            requests.add(request);
        }
        if (newMaxLength != null) {
            PatchRequest request = RequestBuilder.patch(newMaxLength, PatchOperation.REPLACE, "/maxLength");
            requests.add(request);
        }
        if (isHidden != null) {
            PatchRequest request = RequestBuilder.patch(isHidden, PatchOperation.REPLACE, "/isHidden");
            requests.add(request);
        }

        client.editSourceString(foundStringId, requests);
        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.source_string_updated"), foundStringId)));
    }
}
