package com.crowdin.cli.properties;

import lombok.Data;

import java.util.List;

@Data
public class TargetBean {

    private String name;
    private List<FileBean> files;

    @Data
    public static class FileBean {
        private String target;
        private List<String> sources;
        private List<String> sourceDirs;
        private List<String> sourceBranches;
        private List<String> labels;
    }

}
