package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.bundles.model.AddBundleRequest;
import com.crowdin.client.bundles.model.Bundle;
import lombok.AllArgsConstructor;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.SKIPPED;

@AllArgsConstructor
class BundleCloneAction implements NewAction<ProjectProperties, ClientBundle> {

    private Long bundleId;
    private String name;
    private String format;
    private List<String> source;
    private List<String> ignore;
    private String translation;
    private List<Long> labels;
    private boolean plainView;
    private Boolean includeProjectSourceLanguage;
    private Boolean includePseudoLanguage;
    private Boolean isMultilingual;

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientBundle client) {
        Bundle bundleToClone = client.getBundle(bundleId);
        if (Objects.isNull(bundleToClone)) {
            out.println(SKIPPED.withIcon(RESOURCE_BUNDLE.getString("message.bundle.not_found")));
            return;
        }
        AddBundleRequest addBundleRequest = new AddBundleRequest();
        addBundleRequest.setName(
            Objects.isNull(name) ? bundleToClone.getName() + " (clone)" : name
        );
        addBundleRequest.setFormat(Optional.ofNullable(format).orElse(bundleToClone.getFormat()));
        addBundleRequest.setSourcePatterns(Optional.ofNullable(source).orElse(bundleToClone.getSourcePatterns()));
        addBundleRequest.setIgnorePatterns(Optional.ofNullable(ignore).orElse(bundleToClone.getIgnorePatterns()));
        addBundleRequest.setExportPattern(Optional.ofNullable(translation).orElse(bundleToClone.getExportPattern()));
        addBundleRequest.setIncludeProjectSourceLanguage(Optional.ofNullable(includeProjectSourceLanguage).orElse(bundleToClone.getIncludeProjectSourceLanguage()));
        addBundleRequest.setIncludeInContextPseudoLanguage(Optional.ofNullable(includePseudoLanguage).orElse(bundleToClone.getIncludeInContextPseudoLanguage()));
        addBundleRequest.setIsMultilingual(Optional.ofNullable(isMultilingual).orElse(bundleToClone.isMultilingual()));
        addBundleRequest.setLabelIds(labels != null ? labels : bundleToClone.getLabelIds());

        Bundle createdBundle;
        try {
            createdBundle = client.addBundle(addBundleRequest);
        } catch (Exception e) {
            throw ExitCodeExceptionMapper.remap(e, String.format(RESOURCE_BUNDLE.getString("error.bundle_is_not_cloned"), addBundleRequest));
        }

        if (!plainView) {
            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.bundle.list"), createdBundle.getId(),
                createdBundle.getFormat(),
                createdBundle.getExportPattern(), createdBundle.getName())));
        } else {
            out.println(String.valueOf(createdBundle.getId()));
        }
    }
}
