package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.AiContextUtil;
import com.crowdin.client.core.model.PatchOperation;
import com.crowdin.client.core.model.PatchRequest;
import lombok.AllArgsConstructor;

import java.io.File;
import java.util.AbstractMap;
import java.util.List;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@AllArgsConstructor
class ContextUploadAction implements NewAction<ProjectProperties, ProjectClient> {

    private final File file;
    private final boolean overwrite;
    private final boolean dryRun;
    private final boolean plainView;
    private final int batchSize;

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        var stringContextRecords = AiContextUtil.readRecords(file);

        if (overwrite) {
            stringContextRecords = stringContextRecords.stream()
                    .filter(record -> record.getAi_context() == null || record.getAi_context().isEmpty())
                    .toList();
        }

        var recordsWithContext = stringContextRecords
                .stream()
                .map(record -> new AbstractMap.SimpleEntry<>(record, AiContextUtil.fullContext(record.getContext(), record.getAi_context())))
                .toList();

        if (dryRun) {
            recordsWithContext.forEach(record -> {
                if (!plainView) {
                    out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("messages.context.string_upload_dryrun"), record.getKey().getId(), record.getKey().getText(), record.getValue())));
                } else {
                    out.println(record.getKey().getId() + ": " + record.getKey().getText() + " | " + record.getValue());
                }
            });
            return;
        }

        List<PatchRequest> batchContextEdit = recordsWithContext.stream()
                .map(record -> {
                    var request = new PatchRequest();
                    request.setOp(PatchOperation.REPLACE);
                    request.setPath("/" + record.getKey().getId() + "/context");
                    request.setValue(record.getValue());
                    return request;
                })
                .toList();

        for (int i = 0; i < batchContextEdit.size(); i += batchSize) {
            int end = Math.min(i + batchSize, batchContextEdit.size());
            client.batchEditSourceStrings(batchContextEdit.subList(i, end));
            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("messages.context.strings_upload_success"), end, batchContextEdit.size())));
        }

    }
}
