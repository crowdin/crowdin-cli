package com.crowdin.cli.properties;

public class NewPropertiesWithTargetsUtilBuilder {

    public static final String TEST_API_TOKEN = "123abc456";
    public static final String TEST_BASE_URL = "https://crowdin.com";
    public static final String TEST_BASE_PATH = ".";

    private PropertiesWithTargets pb;

    public static NewPropertiesWithTargetsUtilBuilder minimalBuilt() {
        return minimalBuilt(TEST_API_TOKEN, TEST_BASE_URL, TEST_BASE_PATH);
    }

    public static NewPropertiesWithTargetsUtilBuilder minimalBuilt(String apiToken, String baseUrl, String basePath) {
        PropertiesWithTargets pb = new PropertiesWithTargets();
        pb.setApiToken(apiToken);
        pb.setBaseUrl(baseUrl);
        pb.setBasePath(basePath);
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
}
