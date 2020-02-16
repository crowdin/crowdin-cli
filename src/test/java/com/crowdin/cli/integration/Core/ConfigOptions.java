package com.crowdin.cli.integration.Core;

import java.util.ArrayList;
import java.util.List;

public class ConfigOptions {

    private String basePath;
    private String baseUrl;
    private Integer projectId;
    private String token = "#";
    private String source = "*";
    private String translation = "/%two_letters_code%/%original_file_name%";

    public String[] prepare() {
        List<String> args = new ArrayList<>();

        if (this.basePath != null) {
            args.add("--base-path=" + this.basePath);
        }

        if (this.baseUrl != null) {
            args.add("--base-url=" + this.baseUrl);
        }

        if (this.projectId != null) {
            args.add("--project-id=" + this.projectId);
        }

        if (this.token != null) {
            args.add("--token=" + this.token);
        }

        if (this.source != null) {
            args.add("--source=" + this.source);
        }

        if (this.translation != null) {
            args.add("--translation=" + this.translation);
        }

        return args.toArray(new String[0]);
    }

    public ConfigOptions basePath(String basePath) {
        this.basePath = basePath;
        return this;
    }

    public ConfigOptions baseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
        return this;
    }

    public ConfigOptions projectId(Integer projectId) {
        this.projectId = projectId;
        return this;
    }

    public ConfigOptions token(String token) {
        this.token = token;
        return this;
    }

    public ConfigOptions source(String source) {
        this.source = source;
        return this;
    }

    public ConfigOptions translation(String translation) {
        this.translation = translation;
        return this;
    }
}
