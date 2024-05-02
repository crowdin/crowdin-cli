package com.crowdin.cli.properties;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.commons.lang3.StringUtils;

import java.util.Map;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.properties.PropertiesBuilder.PROJECT_ID;
import static com.crowdin.cli.properties.PropertiesBuilder.PROJECT_ID_ENV;
import static com.crowdin.cli.properties.PropertiesBuilder.CROWDIN_PROJECT_ID;

@EqualsAndHashCode(callSuper = true)
@Data
public class ProjectProperties extends BaseProperties {

    static IdPropertiesConfigurator CONFIGURATOR = new IdPropertiesConfigurator();

    private String projectId;

    static class IdPropertiesConfigurator implements PropertiesConfigurator<ProjectProperties> {

        private IdPropertiesConfigurator() {

        }

        @Override
        public void populateWithValues(ProjectProperties props, Map<String, Object> map) {
            PropertiesBuilder.setEnvOrPropertyIfExists(props::setProjectId, map, PROJECT_ID_ENV, PROJECT_ID);
        }

        @Override
        public void populateWithDefaultValues(ProjectProperties props) {
//            do nothing
        }

        @Override
        public void populateWithEnvValues(ProjectProperties props) {
            if (props == null) {
                return;
            }
            PropertiesBuilder.setEnvIfExists(props::setProjectId, CROWDIN_PROJECT_ID);
        }

        @Override
        public PropertiesBuilder.Messages checkProperties(ProjectProperties props, CheckType checkType) {
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
