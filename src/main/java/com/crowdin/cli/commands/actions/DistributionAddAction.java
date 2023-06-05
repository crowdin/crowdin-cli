package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.distributions.model.AddDistributionRequest;
import com.crowdin.client.distributions.model.Distribution;
import com.crowdin.client.distributions.model.ExportMode;
import lombok.AllArgsConstructor;

import java.util.List;
import java.util.Optional;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@AllArgsConstructor
class DistributionAddAction implements NewAction<ProjectProperties, ClientDistribution> {

    private String name;
    private ExportMode exportMode;
    private List<Long> fileId;

//TODO: skip implementation until new changes in client

//    private String format;
//    private String exportPattern;
//
//    private List<Long> labels;

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientDistribution client) {
        Distribution distribution;
        AddDistributionRequest addDistributionRequest = RequestBuilder.addDistribution(name, exportMode, fileId);
        Optional.ofNullable(name).ifPresent(addDistributionRequest::setName);
        Optional.ofNullable(exportMode).ifPresent(addDistributionRequest::setExportMode);
        Optional.ofNullable(fileId).ifPresent(addDistributionRequest::setFileIds);

        try {
            distribution = client.addDistribution(addDistributionRequest);
        } catch (Exception e) {
            throw new RuntimeException(
                    String.format(RESOURCE_BUNDLE.getString("error.distribution_is_not_added"), addDistributionRequest), e);
        }
        out.println(
                OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.distribution.added"), distribution.getName())));
    }

}
