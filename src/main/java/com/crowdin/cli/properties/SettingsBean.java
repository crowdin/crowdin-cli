package com.crowdin.cli.properties;

import lombok.Data;

import java.util.Map;

import static com.crowdin.cli.properties.PropertiesBuilder.IGNORE_HIDDEN_FILES;

@Data
public class SettingsBean {

    static SettingsBeanConfigurator CONFIGURATOR = new SettingsBeanConfigurator();

    private Boolean ignoreHiddenFiles;

    static class SettingsBeanConfigurator implements BeanConfigurator<SettingsBean> {

        private SettingsBeanConfigurator() {

        }

        @Override
        public SettingsBean buildFromMap(Map<String, Object> map) {
            SettingsBean settingsBean = new SettingsBean();
            if (map == null) {
                return settingsBean;
            }
            PropertiesBuilder.setBooleanPropertyIfExists(settingsBean::setIgnoreHiddenFiles, map, IGNORE_HIDDEN_FILES);
            return settingsBean;
        }

        @Override
        public void populateWithDefaultValues(SettingsBean bean) {
            if (bean.getIgnoreHiddenFiles() == null) {
                bean.setIgnoreHiddenFiles(true);
            }
        }
    }
}
