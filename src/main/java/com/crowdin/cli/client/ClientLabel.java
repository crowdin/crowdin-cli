package com.crowdin.cli.client;

import com.crowdin.client.labels.model.AddLabelRequest;
import com.crowdin.client.labels.model.Label;

import java.util.List;

public interface ClientLabel extends Client {

    List<Label> listLabels();

    Label addLabel(AddLabelRequest request);

    void deleteLabel(Long id);
}
