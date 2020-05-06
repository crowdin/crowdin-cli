package com.crowdin.cli.properties;

import com.crowdin.cli.utils.Utils;

import java.util.List;

public class PropertiesBeanBuilder {

    public static final String TEST_PROJECT_ID = "666";
    public static final String TEST_API_TOKEN = "123abc456";
    public static final String TEST_BASE_URL = "https://crowdin.com";

    public static final String STANDARD_SOURCE = "*";
    public static final String STANDARD_TRANSLATIONS = Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%";


    private PropertiesBean pb;

    public PropertiesBeanBuilder minimalPropertiesBean() {
        return minimalPropertiesBean(STANDARD_SOURCE, STANDARD_TRANSLATIONS);
    }

    public static PropertiesBeanBuilder minimalPropertiesBean(String source, String translation) {
        PropertiesBeanBuilder pbBuilder = minimalPropertiesBeanWithoutFileBean();
        FileBean fb = new FileBean();
        fb.setSource(source);
        fb.setTranslation(translation);
        pbBuilder.pb.setFiles(fb);
        return pbBuilder;
    }

    public static PropertiesBeanBuilder minimalBuiltPropertiesBean() {
        return minimalBuiltPropertiesBean(STANDARD_SOURCE, STANDARD_TRANSLATIONS, null);
    }

    public static PropertiesBeanBuilder minimalBuiltPropertiesBean(String source, String translation) {
        return minimalBuiltPropertiesBean(source, translation, null);
    }

    public static PropertiesBeanBuilder minimalBuiltPropertiesBean(String source, String translation, List<String> ignore) {
        PropertiesBeanBuilder pbBuilder = minimalPropertiesBeanWithoutFileBean();
        FileBean fb = new FileBean();
        fb.setSource(source);
        fb.setTranslation(translation);
        fb.setIgnore(ignore);
        fb.setContentSegmentation(true);
        fb.setTranslateContent(true);
        fb.setTranslateAttributes(false);
        fb.setFirstLineContainsHeader(false);
        fb.setEscapeQuotes(3);
        pbBuilder.pb.setFiles(fb);
        return pbBuilder;
    }

    public static PropertiesBeanBuilder minimalPropertiesBeanWithoutFileBean() {
        PropertiesBean pb = new PropertiesBean();
        pb.setProjectId(TEST_PROJECT_ID);
        pb.setApiToken(TEST_API_TOKEN);
        pb.setBasePath(".");
        pb.setBaseUrl(TEST_BASE_URL);
        pb.setPreserveHierarchy(false);
        PropertiesBeanBuilder pbBuilder = new PropertiesBeanBuilder();
        pbBuilder.pb = pb;
        return pbBuilder;
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
