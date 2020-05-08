package com.crowdin.cli.properties;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;


public class PropertiesBean {

    private Boolean preserveHierarchy;

    private String projectId;

    private String apiToken;

    private String basePath;

    private String baseUrl;

    private final List<FileBean> files = new ArrayList<FileBean>();

    @Override
    public String toString() {
        return "PropertiesBean{" +
                "preserveHierarchy=" + preserveHierarchy +
                ", files=" + files +
                ", projectId='" + projectId + '\'' +
                ", apiToken='" + apiToken + '\'' +
                ", basePath='" + basePath + '\'' +
                ", baseUrl='" + baseUrl + '\'' +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PropertiesBean that = (PropertiesBean) o;
        return Objects.equals(preserveHierarchy, that.preserveHierarchy) &&
            Objects.equals(files, that.files) &&
            Objects.equals(projectId, that.projectId) &&
            Objects.equals(apiToken, that.apiToken) &&
            Objects.equals(basePath, that.basePath) &&
            Objects.equals(baseUrl, that.baseUrl);
    }

    @Override
    public int hashCode() {
        return Objects.hash(preserveHierarchy, files, projectId, apiToken, basePath, baseUrl);
    }

    public PropertiesBean() {}

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
        this.basePath = basePath;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }
}
