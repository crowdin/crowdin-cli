package com.crowdin.cli.properties;

import picocli.CommandLine;

public class Params {

    @CommandLine.Option(names = {"--id"}, description = "project id")
    private String idParam;

    @CommandLine.Option(names = {"--token", "--pat"}, description = "token")
    private String tokenParam;

    @CommandLine.Option(names = {"--base-url"}, description = "Base url")
    private String baseUrlParam;

    @CommandLine.Option(names = {"--base-path"}, description = "Base path")
    private String basePathParam;

    @CommandLine.Option(names = {"-s", "--source"}, required = true, description = "Source path")
    private String sourceParam;

    @CommandLine.Option(names = {"-t", "--translation"}, required = true, description = "Translation")
    private String translationParam;

    public String getIdParam() {
        return idParam;
    }

    public void setIdParam(String idParam) {
        this.idParam = idParam;
    }

    public String getTokenParam() {
        return tokenParam;
    }

    public void setTokenParam(String tokenParam) {
        this.tokenParam = tokenParam;
    }

    public String getBaseUrlParam() {
        return baseUrlParam;
    }

    public void setBaseUrlParam(String baseUrlParam) {
        this.baseUrlParam = baseUrlParam;
    }

    public String getBasePathParam() {
        return basePathParam;
    }

    public void setBasePathParam(String basePathParam) {
        this.basePathParam = basePathParam;
    }

    public String getSourceParam() {
        return sourceParam;
    }

    public void setSourceParam(String sourceParam) {
        this.sourceParam = sourceParam;
    }

    public String getTranslationParam() {
        return translationParam;
    }

    public void setTranslationParam(String translationParam) {
        this.translationParam = translationParam;
    }
}
