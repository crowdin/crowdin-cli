package com.crowdin.cli.properties;

public class NewBasePropertiesUtilBuilder {

    public static final String TEST_API_TOKEN = "123abc456";
    public static final String TEST_BASE_URL = "https://crowdin.com";
    public static final String TEST_BASE_PATH = ".";

    private BaseProperties pb;

    public static NewBasePropertiesUtilBuilder minimalBuilt() {
        return minimalBuilt(TEST_API_TOKEN, TEST_BASE_URL, TEST_BASE_PATH);
    }

    public static NewBasePropertiesUtilBuilder minimalBuilt(String apiToken, String baseUrl, String basePath) {
        BaseProperties pb = new BaseProperties();
        pb.setApiToken(apiToken);
        pb.setBaseUrl(baseUrl);
        pb.setBasePath(basePath);
        NewBasePropertiesUtilBuilder builder = new NewBasePropertiesUtilBuilder();
        builder.pb = pb;
        return builder;
    }

    public NewBasePropertiesUtilBuilder setApiToken(String apiToken) {
        pb.setApiToken(apiToken);
        return this;
    }

    public BaseProperties build() {
        return pb;
    }

}
