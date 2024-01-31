package com.crowdin.cli.properties;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.commons.lang3.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.IGNORE_HIDDEN_FILES_PATTERN;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.properties.PropertiesBuilder.FILES;
import static com.crowdin.cli.properties.PropertiesBuilder.PRESERVE_HIERARCHY;
import static com.crowdin.cli.properties.PropertiesBuilder.PSEUDO_LOCALIZATION;

@EqualsAndHashCode(callSuper = true)
@Data
public class PropertiesWithFiles extends ProjectProperties {

    static PropertiesWithFilesConfigurator CONFIGURATOR = new PropertiesWithFilesConfigurator();

    private Boolean preserveHierarchy;
    private List<FileBean> files;
    private PseudoLocalization pseudoLocalization;

    static class PropertiesWithFilesConfigurator implements PropertiesConfigurator<PropertiesWithFiles> {

        private PropertiesWithFilesConfigurator() {

        }

        @Override
        public void populateWithValues(PropertiesWithFiles props, Map<String, Object> map) {
            PropertiesBuilder.setBooleanPropertyIfExists(props::setPreserveHierarchy, map, PRESERVE_HIERARCHY);
            props.setFiles(PropertiesBuilder.getListOfMaps(map, FILES)
                .stream()
                .map(FileBean.CONFIGURATOR::buildFromMap)
                .collect(Collectors.toList()));
            props.setPseudoLocalization(PseudoLocalization.CONFIGURATOR.buildFromMap(PropertiesBuilder.getMap(map, PSEUDO_LOCALIZATION)));
        }

        @Override
        public void populateWithDefaultValues(PropertiesWithFiles props) {
            props.setPreserveHierarchy(props.getPreserveHierarchy() != null ? props.getPreserveHierarchy() : Boolean.FALSE);
            if (props.getSettings().getIgnoreHiddenFiles() && props.getFiles() != null) {
                for (FileBean fb : props.getFiles()) {
                    List<String> ignores = (fb.getIgnore() != null) ? fb.getIgnore() : new ArrayList<>();
                    ignores.add(IGNORE_HIDDEN_FILES_PATTERN);
                    fb.setIgnore(ignores);
                }
            }
            if (props.getFiles() != null) {
                for (FileBean file : props.getFiles()) {
                    FileBean.CONFIGURATOR.populateWithDefaultValues(file);
                }
            }
            if (props.getPseudoLocalization() != null) {
                PseudoLocalization.CONFIGURATOR.populateWithDefaultValues(props.getPseudoLocalization());
            }
        }

        @Override
        public PropertiesBuilder.Messages checkProperties(PropertiesWithFiles props, CheckType checkType) {
            PropertiesBuilder.Messages messages = new PropertiesBuilder.Messages();
            if (props.getFiles() == null || props.getFiles().isEmpty()) {
                messages.addWarning(RESOURCE_BUNDLE.getString("message.warning.empty_or_missed_section_files"));
            } else {
                for (FileBean fileBean : props.getFiles()) {
                    messages.addAllErrors(FileBean.CONFIGURATOR.checkProperties(fileBean));
                    if (StringUtils.isNotEmpty(fileBean.getDest()) && !props.getPreserveHierarchy()) {
                        messages.addError(RESOURCE_BUNDLE.getString("error.dest_and_preserve_hierarchy"));
                    }
                }
            }
            if (props.getPseudoLocalization() != null) {
                messages.addAllErrors(PseudoLocalization.CONFIGURATOR.checkProperties(props.getPseudoLocalization()));
            }
            return messages;
        }
    }
}
