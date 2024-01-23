package com.crowdin.cli.client;

import com.crowdin.client.Client;
import com.crowdin.client.labels.model.AddLabelRequest;
import com.crowdin.client.labels.model.Label;
import lombok.AllArgsConstructor;

import java.util.List;

import static java.lang.Long.parseLong;

@AllArgsConstructor
public class CrowdinClientLabel extends CrowdinClientCore implements ClientLabel {

    private final Client client;
    private final String projectId;

    @Override
    public List<Label> listLabels() {
        return executeRequestFullList((limit, offset) -> this.client.getLabelsApi()
            .listLabels(parseLong(this.projectId), limit, offset, null));
    }

    @Override
    public Label addLabel(AddLabelRequest request) {
        return executeRequest(() -> this.client.getLabelsApi()
            .addLabel(parseLong(this.projectId), request)
            .getData());
    }

    @Override
    public void deleteLabel(Long id) {
        executeRequest(() -> {
            this.client.getLabelsApi().deleteLabel(parseLong(this.projectId), id);
            return null;
        });
    }
}
