package com.crowdin.cli.properties;

import picocli.CommandLine;

public class Params {

    @CommandLine.Option(names = {"--id"}, description = "Set path to the configuration file")
    private String idParam;

    @CommandLine.Option(names = {"--token", "--pat"}, description = "Set path to the configuration file")
    private String tokenParam;

    @CommandLine.Option(names = {"--base-url"}, description = "Set path to the configuration file")
    private String baseUrlParam;

    @CommandLine.Option(names = {"--base-path"}, description = "Set path to the configuration file")
    private String basePathParam;

    @CommandLine.Option(names = {"-s", "--source"}, required = true, description = "Set path to the configuration file")
    private String sourceParam;

    @CommandLine.Option(names = {"-t", "--translation"}, required = true, description = "Set path to the configuration file")
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
