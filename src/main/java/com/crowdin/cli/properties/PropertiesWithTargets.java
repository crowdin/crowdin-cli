package com.crowdin.cli.properties;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.properties.PropertiesBuilder.TARGETS;

@EqualsAndHashCode(callSuper = true)
@Data
public class PropertiesWithTargets extends ProjectProperties {

    static PropertiesWithTargetsConfigurator CONFIGURATOR = new PropertiesWithTargetsConfigurator();

    private List<TargetBean> targets;

    static class PropertiesWithTargetsConfigurator implements PropertiesConfigurator<PropertiesWithTargets> {

        private PropertiesWithTargetsConfigurator() {

        }

        @Override
        public void populateWithValues(PropertiesWithTargets props, Map<String, Object> map) {
            props.setTargets(PropertiesBuilder.getListOfMaps(map, TARGETS)
                .stream()
                .map(TargetBean.CONFIGURATOR::buildFromMap)
                .collect(Collectors.toList()));
        }

        @Override
        public void populateWithDefaultValues(PropertiesWithTargets props) {
            if (props.getTargets() == null) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.configuration_file_not_exist"));
            }
            for (TargetBean tb : props.getTargets()) {
                TargetBean.CONFIGURATOR.populateWithDefaultValues(tb);
            }
        }

        @Override
        public PropertiesBuilder.Messages checkProperties(PropertiesWithTargets props, CheckType checkType) {
            PropertiesBuilder.Messages messages = new PropertiesBuilder.Messages();
            if (props.getTargets() == null || props.getTargets().isEmpty()) {
                messages.addError(RESOURCE_BUNDLE.getString("error.config.empty_or_missed_section_targets"));
            } else {
                for (TargetBean tb : props.getTargets())  {
                    messages.addAllErrors(TargetBean.CONFIGURATOR.checkProperties(tb));
                }
            }
            return messages;
        }
    }
}
