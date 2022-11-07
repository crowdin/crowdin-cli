package com.crowdin.cli.properties;

import java.util.ArrayList;
import java.util.List;

public class NewPropertiesWithTargetsUtilBuilder {

    public static final String TEST_API_TOKEN = "123abc456";
    public static final String TEST_BASE_URL = "https://crowdin.com";
    public static final String TEST_BASE_PATH = ".";

    private PropertiesWithTargets pb;

    public static NewPropertiesWithTargetsUtilBuilder minimalBuilt() {
        List<TargetBean> targetBeans = new ArrayList<TargetBean>();
        TargetBean bean = new TargetBean();
        bean.setName("android");
        targetBeans.add(bean);
        return minimalBuilt(TEST_API_TOKEN, TEST_BASE_URL, TEST_BASE_PATH, targetBeans);
    }

    public static NewPropertiesWithTargetsUtilBuilder minimalBuilt(String apiToken, String baseUrl, String basePath, List<TargetBean> targets) {
        PropertiesWithTargets pb = new PropertiesWithTargets();
        pb.setApiToken(apiToken);
        pb.setBaseUrl(baseUrl);
        pb.setBasePath(basePath);
        pb.setTargets(targets);
        NewPropertiesWithTargetsUtilBuilder builder = new NewPropertiesWithTargetsUtilBuilder();
        builder.pb = pb;
        return builder;
    }

    public NewPropertiesWithTargetsUtilBuilder setApiToken(String apiToken) {
        pb.setApiToken(apiToken);
        return this;
    }

    public PropertiesWithTargets build() {
        return pb;
    }

    public String buildToString() {
        StringBuilder sb = new StringBuilder();
        sb.append("\"project_id\": \"").append("666").append("\"\n");

        if (pb.getApiToken() != null) {
            sb.append("\"api_token\": \"").append(pb.getApiToken()).append("\"\n");
        }
        if (pb.getBasePath() != null) {
            sb.append("\"base_path\": \"").append(pb.getBasePath().replaceAll("\\\\", "\\\\\\\\")).append("\"\n");
        }
        if (pb.getBaseUrl() != null) {
            sb.append("\"base_url\": \"").append(pb.getBaseUrl()).append("\"\n");
        }
        if (pb.getTargets() != null && !pb.getTargets().isEmpty()) {
            sb.append("targets: [\n");
            for (TargetBean tb : pb.getTargets()) {
                sb.append("{\n");
                if (tb.getName() != null) {
                    sb.append("\"name\": \"").append(tb.getName().replaceAll("\\\\", "\\\\\\\\")).append("\",\n");
                }
                sb.append("},\n");
            }
            sb.append("]");
        }
        return sb.toString();
    }
}
