package com.crowdin.cli.properties;

import com.crowdin.cli.utils.Utils;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * @author ihor
 */
public class PropertiesBean {

    private Boolean preserveHierarchy;

    private final List<FileBean> files = new ArrayList<FileBean>();

    private String projectIdentifier;

    private String apiKey;

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

    public String getProjectIdentifier() {
        return projectIdentifier;
    }

    public void setProjectIdentifier(String projectIdentifier) {
        this.projectIdentifier = projectIdentifier;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
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
