package com.crowdin.cli.properties;

import com.crowdin.cli.utils.Utils;

import java.util.ArrayList;
import java.util.List;

public class NewPropertiesWithFilesUtilBuilder {

    public static final String TEST_PROJECT_ID = "666";
    public static final String TEST_API_TOKEN = "123abc456";
    public static final String TEST_BASE_URL = "https://crowdin.com";
    public static final String TEST_BASE_PATH = ".";

    public static final String STANDARD_SOURCE = "*";
    public static final String STANDARD_TRANSLATIONS = Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%";


    private PropertiesWithFiles pb;

    public NewPropertiesWithFilesUtilBuilder minimalPropertiesBean() {
        return minimalPropertiesBean(STANDARD_SOURCE, STANDARD_TRANSLATIONS);
    }

    public static NewPropertiesWithFilesUtilBuilder minimalPropertiesBean(String source, String translation) {
        NewPropertiesWithFilesUtilBuilder pbBuilder = minimalPropertiesBeanWithoutFileBean();
        pbBuilder.addBuiltFileBean(source, translation);
        return pbBuilder;
    }

    public static NewPropertiesWithFilesUtilBuilder minimalBuiltPropertiesBean() {
        return minimalBuiltPropertiesBean(STANDARD_SOURCE, STANDARD_TRANSLATIONS, null);
    }

    public static NewPropertiesWithFilesUtilBuilder minimalBuiltPropertiesBean(String source, String translation) {
        return minimalBuiltPropertiesBean(source, translation, null);
    }

    public static NewPropertiesWithFilesUtilBuilder minimalBuiltPropertiesBean(String source, String translation, List<String> ignore) {
        return minimalBuiltPropertiesBean(source, translation, ignore, null);
    }

    public static NewPropertiesWithFilesUtilBuilder minimalBuiltPropertiesBean(String source, String translation, List<String> ignore, String dest) {
        NewPropertiesWithFilesUtilBuilder pbBuilder = minimalPropertiesBeanWithoutFileBean();
        pbBuilder.addBuiltFileBean(source, translation, ignore, dest);
        return pbBuilder;
    }

    public static NewPropertiesWithFilesUtilBuilder minimalPropertiesBeanWithoutFileBean() {
        PropertiesWithFiles pb = new PropertiesWithFiles();
        pb.setProjectId(TEST_PROJECT_ID);
        pb.setApiToken(TEST_API_TOKEN);
        pb.setBasePath(TEST_BASE_PATH);
        pb.setBaseUrl(TEST_BASE_URL);
        pb.setPreserveHierarchy(false);
        NewPropertiesWithFilesUtilBuilder pbBuilder = new NewPropertiesWithFilesUtilBuilder();
        pbBuilder.pb = pb;
        return pbBuilder;
    }

    public NewPropertiesWithFilesUtilBuilder setBasePath(String basePath) {
        this.pb.setBasePath(basePath);
        return this;
    }

    public NewPropertiesWithFilesUtilBuilder setPreserveHierarchy(Boolean preserveHierarchy) {
        this.pb.setPreserveHierarchy(preserveHierarchy);
        return this;
    }

    public NewPropertiesWithFilesUtilBuilder setExportLanguages(List<String> exportLanguages) {
        this.pb.setExportLanguages(exportLanguages);
        return this;
    }

    public NewPropertiesWithFilesUtilBuilder addBuiltFileBean(String source, String translation) {
        return this.addBuiltFileBean(source, translation, null, null);
    }

    public NewPropertiesWithFilesUtilBuilder addBuiltFileBean(String source, String translation, List<String> ignore, String dest) {
        if (pb.getFiles() == null) {
            pb.setFiles(new ArrayList<>());
        }
        this.pb.getFiles().add(builtFileBean(source, translation, ignore, dest));
        return this;
    }

    public PropertiesWithFiles build() {
        return pb;
    }

    private static FileBean fileBean(String source, String translation) {
        FileBean fb = new FileBean();
        fb.setSource(source);
        fb.setTranslation(translation);
        return fb;
    }

    private static FileBean builtFileBean(String source, String translation, List<String> ignore, String dest) {
        FileBean fb = fileBean(source, translation);
        fb.setDest(dest);
        fb.setIgnore(ignore);
        fb.setContentSegmentation(true);
        fb.setTranslateContent(true);
        fb.setTranslateAttributes(false);
        fb.setFirstLineContainsHeader(false);
        fb.setEscapeQuotes(3);
        return fb;
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
        if (pb.getExportLanguages() != null && !pb.getExportLanguages().isEmpty()) {
            sb.append("\"export_languages\": [");
            for (int i = 0; i < pb.getExportLanguages().size(); i++) {
                if (i > 0) sb.append(", ");
                sb.append("\"").append(pb.getExportLanguages().get(i)).append("\"");
            }
            sb.append("]\n");
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
