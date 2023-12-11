package com.crowdin.cli.properties;

import com.crowdin.cli.utils.Utils;
import lombok.Data;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.FILE_FORMAT_MAPPER;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.properties.PropertiesBuilder.BRANCHES;
import static com.crowdin.cli.properties.PropertiesBuilder.DIRECTORIES;
import static com.crowdin.cli.properties.PropertiesBuilder.EXPORT_APPROVED_ONLY;
import static com.crowdin.cli.properties.PropertiesBuilder.FILES;
import static com.crowdin.cli.properties.PropertiesBuilder.LABELS;
import static com.crowdin.cli.properties.PropertiesBuilder.NAME;
import static com.crowdin.cli.properties.PropertiesBuilder.SKIP_UNTRANSLATED_FILES;
import static com.crowdin.cli.properties.PropertiesBuilder.SKIP_UNTRANSLATED_STRINGS;
import static com.crowdin.cli.properties.PropertiesBuilder.EXPORT_STRINGS_THAT_PASSED_WORKFLOW;
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
        private Boolean skipTranslatedOnly;
        private Boolean skipUntranslatedFiles;
        private Boolean exportApprovedOnly;
        private Boolean exportStringsThatPassedWorkflow;
    }

    static class TargetBeanConfigurator implements BeanConfigurator<TargetBean> {

        private TargetBeanConfigurator() {

        }

        @Override
        public TargetBean buildFromMap(Map<String, Object> map) {
            TargetBean tb = new TargetBean();
            PropertiesBuilder.setPropertyIfExists(tb::setName, map, NAME, String.class);
            tb.setFiles(PropertiesBuilder.getListOfMaps(map, FILES)
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
            PropertiesBuilder.setBooleanPropertyIfExists(fb::setSkipTranslatedOnly,   map, SKIP_UNTRANSLATED_STRINGS);
            PropertiesBuilder.setBooleanPropertyIfExists(fb::setSkipUntranslatedFiles,     map, SKIP_UNTRANSLATED_FILES);
            PropertiesBuilder.setBooleanPropertyIfExists(fb::setExportApprovedOnly,        map, EXPORT_APPROVED_ONLY);
            PropertiesBuilder.setBooleanPropertyIfExists(fb::setExportStringsThatPassedWorkflow, map, EXPORT_STRINGS_THAT_PASSED_WORKFLOW);
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
                    errors.add(String.format(RESOURCE_BUNDLE.getString("error.config.target_contains_wrong_format"),
                        tbName, FilenameUtils.getExtension(fb.getFile())));
                }
                if (fb.getSkipTranslatedOnly() != null && fb.getSkipUntranslatedFiles() != null
                    && fb.getSkipTranslatedOnly() && fb.getSkipUntranslatedFiles()) {
                    errors.add(RESOURCE_BUNDLE.getString("error.skip_untranslated_both_strings_and_files"));
                }
            }
            return errors;
        }
    }

}
