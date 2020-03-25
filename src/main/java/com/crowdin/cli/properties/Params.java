package com.crowdin.cli.properties;

import picocli.CommandLine;

public class Params {

    @CommandLine.Option(names = {"-i", "--project-id"}, paramLabel = "...", descriptionKey = "params.project-id")
    private String idParam;

    @CommandLine.Option(names = {"-T", "--token"}, paramLabel = "...", descriptionKey = "params.token")
    private String tokenParam;

    @CommandLine.Option(names = {"--base-url"}, paramLabel = "...", descriptionKey = "params.base-url")
    private String baseUrlParam;

    @CommandLine.Option(names = {"--base-path"}, paramLabel = "...", descriptionKey = "params.base-path")
    private String basePathParam;

    @CommandLine.Option(names = {"-s", "--source"}, paramLabel = "...", descriptionKey = "params.source")
    private String sourceParam;

    @CommandLine.Option(names = {"-t", "--translation"}, paramLabel = "...", descriptionKey = "params.translation")
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
