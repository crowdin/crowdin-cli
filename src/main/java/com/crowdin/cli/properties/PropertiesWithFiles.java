package com.crowdin.cli.properties;

import com.crowdin.cli.client.Clients;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.utils.file.FileUtils;
import com.crowdin.client.languages.model.Language;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.commons.lang3.StringUtils;
import org.yaml.snakeyaml.nodes.MappingNode;
import org.yaml.snakeyaml.nodes.NodeTuple;
import org.yaml.snakeyaml.nodes.ScalarNode;
import org.yaml.snakeyaml.nodes.SequenceNode;

import java.util.*;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.IGNORE_HIDDEN_FILES_PATTERN;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.properties.PropertiesBuilder.*;

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
            var ymlMeta = map.getOrDefault(FileUtils.YML_META, null);
            //raw files node in yml
            var filesMeta = Optional
                    .ofNullable(ymlMeta)
                    .filter(yml -> yml instanceof MappingNode)
                    .map(MappingNode.class::cast)
                    .map(MappingNode::getValue)
                    .flatMap(values -> values.stream()
                            .filter(v -> v.getKeyNode() instanceof ScalarNode)
                            .filter(v -> ScalarNode.class.cast(v.getKeyNode()).getValue().equals(FILES))
                            .map(NodeTuple::getValueNode)
                            .filter(v -> v instanceof SequenceNode)
                            .map(SequenceNode.class::cast)
                            .map(SequenceNode::getValue)
                            .findFirst()
                    )
                    .orElse(null);

            List<FileBean> fileBeans = new ArrayList<>();
            List<Map<String, Object>> listOfMaps = PropertiesBuilder.getListOfMaps(map, FILES);

            for (int i = 0; i < listOfMaps.size(); i++) {
                var fileMap = listOfMaps.get(i);
                int finalI = i;
                //raw languages node in yml
                var languageMappingMeta = Optional.ofNullable(filesMeta)
                        .filter(l -> l.size() > finalI)
                        .map(l -> l.get(finalI))
                        .filter(n -> n instanceof MappingNode)
                        .map(MappingNode.class::cast)
                        .map(MappingNode::getValue)
                        .flatMap(values-> values.stream()
                                .filter(v -> v.getKeyNode() instanceof ScalarNode)
                                .filter(v -> ScalarNode.class.cast(v.getKeyNode()).getValue().equals(LANGUAGES_MAPPING))
                                .map(NodeTuple::getValueNode)
                                .filter(n -> n instanceof MappingNode)
                                .map(MappingNode.class::cast)
                                .map(MappingNode::getValue)
                                .map(v -> {
                                    Map<String, Map<String, String>> actualValues = new HashMap<>();
                                    v.stream()
                                            .filter(e -> e.getKeyNode() instanceof ScalarNode)
                                            .filter(e -> e.getValueNode() instanceof MappingNode)
                                            .forEach(e -> {
                                                var key = ScalarNode.class.cast(e.getKeyNode()).getValue();
                                                var val = MappingNode.class.cast(e.getValueNode());
                                                Map<String, String> subMap = new HashMap<>();
                                                val.getValue()
                                                        .stream()
                                                        .filter(e2 -> e2.getKeyNode() instanceof ScalarNode)
                                                        .filter(e2 -> e2.getValueNode() instanceof ScalarNode)
                                                        .forEach(e2 -> subMap.put(
                                                                ScalarNode.class.cast(e2.getKeyNode()).getValue(),
                                                                ScalarNode.class.cast(e2.getValueNode()).getValue()
                                                        ));
                                                actualValues.put(key, subMap);
                                            });
                                    return actualValues;
                                })
                                .findFirst()
                        );
                languageMappingMeta.ifPresent(meta -> fileMap.put(FileBean.LANGUAGES_META, meta));
                var fileBean = FileBean.CONFIGURATOR.buildFromMap(fileMap);
                fileBeans.add(fileBean);
            }
            props.setFiles(fileBeans);

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
        public void populateWithEnvValues(PropertiesWithFiles props) {
//          do nothing
        }

        @Override
        public PropertiesBuilder.Messages checkProperties(PropertiesWithFiles props, CheckType checkType) {
            PropertiesBuilder.Messages messages = new PropertiesBuilder.Messages();
            if (props.getFiles() == null || props.getFiles().isEmpty()) {
                messages.addError(RESOURCE_BUNDLE.getString("error.config.empty_or_missed_section_files"));
            } else {
                for (FileBean fileBean : props.getFiles()) {
                    messages.addAllErrors(FileBean.CONFIGURATOR.checkProperties(fileBean));
                    if (StringUtils.isNotEmpty(fileBean.getDest()) && !props.getPreserveHierarchy()) {
                        messages.addError(RESOURCE_BUNDLE.getString("error.dest_and_preserve_hierarchy"));
                    }
                    if (fileBean.getLanguagesMapping() != null) {
                        ProjectClient projectClient = Clients.getProjectClient(props.getApiToken(), props.getBaseUrl(), Long.parseLong(props.getProjectId()));
                        List<Language> languages = projectClient.listSupportedLanguages();

                        if (languages != null) {
                            Set<String> langCodes = languages.stream().map(lang -> lang.getId().toLowerCase()).collect(Collectors.toSet());

                            boolean hasInvalidCode = fileBean.getLanguagesMapping().values().stream()
                                    .flatMap(innerMap -> innerMap.keySet().stream())
                                    .anyMatch(langCode -> !langCodes.contains(langCode.toLowerCase()));
                            if (hasInvalidCode) {
                                messages.addError(RESOURCE_BUNDLE.getString("error.config.languages_mapping"));
                            }
                        }
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
