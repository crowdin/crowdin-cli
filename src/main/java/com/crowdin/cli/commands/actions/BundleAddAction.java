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
import java.util.Optional;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@AllArgsConstructor
class BundleAddAction implements NewAction<ProjectProperties, ClientBundle> {

    private String name;

    private String format;

    private List<String> source;

    private List<String> ignore;

    private String translation;

    private List<Long> labels;

    private boolean plainView;

    private boolean includeProjectSourceLanguage;

    private boolean includePseudoLanguage;

    private boolean isMultilingual;

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientBundle client) {
        Bundle bundle;
        AddBundleRequest addBundleRequest = new AddBundleRequest();
        Optional.ofNullable(name).ifPresent(addBundleRequest::setName);
        Optional.ofNullable(format).ifPresent(addBundleRequest::setFormat);
        Optional.ofNullable(source).ifPresent(addBundleRequest::setSourcePatterns);
        Optional.ofNullable(ignore).ifPresent(addBundleRequest::setIgnorePatterns);
        Optional.ofNullable(translation).ifPresent(addBundleRequest::setExportPattern);
        addBundleRequest.setIncludeProjectSourceLanguage(includeProjectSourceLanguage);
        addBundleRequest.setIncludeInContextPseudoLanguage(includePseudoLanguage);
        addBundleRequest.setIsMultilingual(isMultilingual);

        Optional.ofNullable(labels).ifPresent(addBundleRequest::setLabelIds);

        try {
            bundle = client.addBundle(addBundleRequest);
        } catch (Exception e) {
            throw ExitCodeExceptionMapper.remap(e, String.format(RESOURCE_BUNDLE.getString("error.bundle_is_not_added"), addBundleRequest));
        }

        if (!plainView) {
            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.bundle.list"), bundle.getId(),
                    bundle.getFormat(),
                    bundle.getExportPattern(), bundle.getName())));
        } else {
            out.println(String.valueOf(bundle.getId()));
        }

    }

}
