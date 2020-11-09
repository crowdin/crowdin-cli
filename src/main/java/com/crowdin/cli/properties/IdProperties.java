package com.crowdin.cli.properties;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.commons.lang3.StringUtils;

import java.util.Map;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.properties.PropertiesBuilder.PROJECT_ID;
import static com.crowdin.cli.properties.PropertiesBuilder.PROJECT_ID_ENV;

@EqualsAndHashCode(callSuper = true)
@Data
public class IdProperties extends BaseProperties {

    static IdPropertiesConfigurator CONFIGURATOR = new IdPropertiesConfigurator();

    private String projectId;

    static class IdPropertiesConfigurator implements PropertiesConfigurator<IdProperties> {

        private IdPropertiesConfigurator() {

        }

        @Override
        public void populateWithValues(IdProperties props, Map<String, Object> map) {
            PropertiesBuilder.setEnvOrPropertyIfExists(props::setProjectId, map, PROJECT_ID_ENV, PROJECT_ID);
        }

        @Override
        public void populateWithDefaultValues(IdProperties props) {
//            do nothing
        }

        @Override
        public PropertiesBuilder.Messages checkProperties(IdProperties props, CheckType checkType) {
            PropertiesBuilder.Messages messages = new PropertiesBuilder.Messages();
            if (StringUtils.isEmpty(props.getProjectId())) {
                messages.addError(RESOURCE_BUNDLE.getString("error.config.missed_project_id"));
            } else if (!StringUtils.isNumeric(props.getProjectId())) {
                messages.addError(RESOURCE_BUNDLE.getString("error.config.project_id_is_not_number"));
            }
            return messages;
        }
    }

}
