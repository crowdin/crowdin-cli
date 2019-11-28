package com.crowdin.cli.properties;

import com.crowdin.cli.utils.Utils;

import java.util.ArrayList;
import java.util.List;


public class PropertiesBean {

    private Boolean preserveHierarchy;

    private final List<FileBean> files = new ArrayList<FileBean>();

    private String projectId;

    private String apiToken;

    private String basePath;

    private String baseUrl;

    private String accountKey;

    public List<FileBean> getFiles() {
        return files;
    }

    public void setFiles(FileBean files) {
        this.files.add(files);
    }

    public Boolean getPreserveHierarchy() {
        return preserveHierarchy;
    }

    public void setPreserveHierarchy(Boolean preserveHierarchy) {
        this.preserveHierarchy = preserveHierarchy;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getApiToken() {
        return apiToken;
    }

    public void setApiToken(String apiToken) {
        this.apiToken = apiToken;
    }

    public String getBasePath() {
        return basePath;
    }

    public void setBasePath(String basePath) {
        if (basePath != null && !basePath.isEmpty() && !basePath.endsWith(Utils.PATH_SEPARATOR) && !".".equals(basePath)) {
            this.basePath = basePath + Utils.PATH_SEPARATOR;
        } else {
            this.basePath = basePath;
        }
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getAccountKey() {
        return accountKey;
    }

    public void setAccountKey(String accountKey) {
        this.accountKey = accountKey;
    }
}
