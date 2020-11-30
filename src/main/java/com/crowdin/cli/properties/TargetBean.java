package com.crowdin.cli.properties;

import com.crowdin.cli.utils.Utils;
import lombok.Data;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.FILE_FORMAT_MAPPER;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.properties.PropertiesBuilder.BRANCHES;
import static com.crowdin.cli.properties.PropertiesBuilder.DIRECTORIES;
import static com.crowdin.cli.properties.PropertiesBuilder.FILES;
import static com.crowdin.cli.properties.PropertiesBuilder.LABELS;
import static com.crowdin.cli.properties.PropertiesBuilder.NAME;
import static com.crowdin.cli.properties.PropertiesBuilder.SOURCES;
import static com.crowdin.cli.properties.PropertiesBuilder.FILE;

@Data
public class TargetBean {

    static TargetBeanConfigurator CONFIGURATOR = new TargetBeanConfigurator();

    private String name;
    private List<FileBean> files;

    @Data
    public static class FileBean {
        private String file;
        private List<String> sources;
        private List<String> sourceDirs;
        private List<String> sourceBranches;
        private List<String> labels;
    }

    static class TargetBeanConfigurator implements BeanConfigurator<TargetBean> {

        private TargetBeanConfigurator() {

        }

        @Override
        public TargetBean buildFromMap(Map<String, Object> map) {
            TargetBean tb = new TargetBean();
            PropertiesBuilder.setPropertyIfExists(tb::setName, map, NAME, String.class);
            tb.setFiles(((List<Map<String, Object>>) map.getOrDefault(FILES, Collections.EMPTY_LIST))
                .stream()
                .map(this::buildTargetFileBeanFromMap)
                .collect(Collectors.toList()));
            return tb;
        }

        private TargetBean.FileBean buildTargetFileBeanFromMap(Map<String, Object> map) {
            TargetBean.FileBean fb = new TargetBean.FileBean();
            PropertiesBuilder.setPropertyIfExists(fb::setFile, map, FILE, String.class);
            PropertiesBuilder.setPropertyIfExists(fb::setSources, map, SOURCES, List.class);
            PropertiesBuilder.setPropertyIfExists(fb::setSourceDirs, map, DIRECTORIES, List.class);
            PropertiesBuilder.setPropertyIfExists(fb::setSourceBranches, map, BRANCHES, List.class);
            PropertiesBuilder.setPropertyIfExists(fb::setLabels, map, LABELS, List.class);
            return fb;
        }

        @Override
        public void populateWithDefaultValues(TargetBean bean) {
            for (FileBean fb : bean.getFiles()) {
                if (fb.getSources() != null) {
                    apply(fb.getSources(), s -> StringUtils.removeStart(Utils.normalizePath(s), Utils.PATH_SEPARATOR));
                }
                if (fb.getSourceDirs() != null) {
                    apply(fb.getSourceDirs(), s -> {
                        String s1 = Utils.normalizePath(s);
                        String s2 = StringUtils.removeEnd(s1, Utils.PATH_SEPARATOR) + Utils.PATH_SEPARATOR;
                        return StringUtils.removeStart(s2, Utils.PATH_SEPARATOR);
                    });
                }
                if (fb.getSourceBranches() != null) {
                    apply(fb.getSourceBranches(), s ->
                        StringUtils.removeStart(StringUtils.removeEnd(s, Utils.PATH_SEPARATOR_REGEX), Utils.PATH_SEPARATOR_REGEX));
                }
            }
        }

        private void apply(List<String> list, Function<String, String> op) {
            for (int i = 0; i < list.size(); i++) {
                list.set(i, op.apply(list.get(i)));
            }
        }

        @Override
        public List<String> checkProperties(TargetBean bean) {
            List<String> errors = new ArrayList<>();
            if (StringUtils.isBlank(bean.getName())) {
                errors.add(RESOURCE_BUNDLE.getString("error.config.target_has_no_name"));
            }
            String tbName = (StringUtils.isBlank(bean.getName())) ? "with no name" : "'" + bean.getName() + "'";
            for (FileBean fb : bean.getFiles()) {
                int contFiles = (fb.getSources() != null && !fb.getSources().isEmpty()) ? 1 : 0;
                int contDirs = (fb.getSourceDirs() != null && !fb.getSourceDirs().isEmpty()) ? 1 : 0;
                int contBranches = (fb.getSourceBranches() != null && !fb.getSourceBranches().isEmpty()) ? 1 : 0;
                if (contFiles + contDirs + contBranches > 1) {
                    errors.add(String.format(RESOURCE_BUNDLE.getString("error.config.target_has_more_than_one_type_of_sources"), tbName));
                } else if (contFiles + contDirs + contBranches == 0) {
                    errors.add(String.format(RESOURCE_BUNDLE.getString("error.config.target_has_no_sources"), tbName));
                }
                if (fb.getFile() == null) {
                    errors.add(String.format(RESOURCE_BUNDLE.getString("error.config.target_has_no_target_field"), tbName));
                } else if (!FILE_FORMAT_MAPPER.containsKey(FilenameUtils.getExtension(fb.getFile()))) {
                    errors.add(String.format(RESOURCE_BUNDLE.getString("error.config.target_contains_wrong_format"), tbName, FilenameUtils.getExtension(fb.getFile())));
                }
            }
            return errors;
        }
    }

}
