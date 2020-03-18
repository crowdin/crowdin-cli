package com.crowdin.cli.properties;

import com.crowdin.cli.utils.Utils;

public class PropertiesBeanBuilder {

    public static final String TEST_PROJECT_ID = "666";
    public static final String TEST_API_TOKEN = "123abc456";
    public static final String TEST_BASE_URL = "https://crowdin.com/api/v2";


    private PropertiesBean pb = new PropertiesBean();

    public PropertiesBeanBuilder minimalPropertiesBean() {
        pb.setProjectId(TEST_PROJECT_ID);
        pb.setApiToken(TEST_API_TOKEN);
        pb.setBasePath(".");
        pb.setBaseUrl(TEST_BASE_URL);
        FileBean fb = new FileBean();
        fb.setSource("*");
        fb.setTranslation(Utils.PATH_SEPARATOR + "hell-%locale%");
        pb.setFiles(fb);
        return this;
    }

    public PropertiesBeanBuilder minimalBuiltPropertiesBean() {
        pb.setProjectId(TEST_PROJECT_ID);
        pb.setApiToken(TEST_API_TOKEN);
        pb.setBasePath(".");
        pb.setBaseUrl(TEST_BASE_URL);
        pb.setPreserveHierarchy(false);
        FileBean fb = new FileBean();
        fb.setSource("*");
        fb.setTranslation(Utils.PATH_SEPARATOR + "hell-%locale%");
        fb.setContentSegmentation(true);
        fb.setTranslateContent(true);
        fb.setEscapeQuotes(3);
        pb.setFiles(fb);
        return this;
    }

    public PropertiesBeanBuilder setBasePath(String basePath) {
        this.pb.setBasePath(basePath);
        return this;
    }

    public PropertiesBean build() {
        return pb;
    }

    public String buildToString() {
        StringBuilder sb = new StringBuilder();
        if (pb.getProjectId() != null) {
            sb.append("\"project_id\": \"").append(pb.getProjectId()).append("\"\n");
        }
        if (pb.getApiToken() != null) {
            sb.append("\"api_token\": \"").append(pb.getApiToken()).append("\"\n");
        }
        if (pb.getBasePath() != null) {
            sb.append("\"base_path\": \"").append(pb.getBasePath().replaceAll("\\\\", "\\\\\\\\")).append("\"\n");
        }
        if (pb.getBaseUrl() != null) {
            sb.append("\"base_url\": \"").append(pb.getBaseUrl()).append("\"\n");
        }
        if (pb.getPreserveHierarchy() != null) {
            sb.append("\"preserve_hierarchy\": \"").append(pb.getPreserveHierarchy()).append("\"\n");
        }
        if (pb.getFiles() != null && !pb.getFiles().isEmpty()) {
            sb.append("files: [\n");
            for (FileBean fb : pb.getFiles()) {
                sb.append("{\n");
                if (fb.getSource() != null) {
                    sb.append("\"source\": \"").append(fb.getSource().replaceAll("\\\\", "\\\\\\\\")).append("\",\n");
                }
                if (fb.getTranslation() != null) {
                    sb.append("\"translation\": \"").append(fb.getTranslation().replaceAll("\\\\", "\\\\\\\\")).append("\",\n");
                }
                sb.append("},\n");
            }
            sb.append("]");
        }
        return sb.toString();
    }
}
