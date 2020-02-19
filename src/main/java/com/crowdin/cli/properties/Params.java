package com.crowdin.cli.properties;

import picocli.CommandLine;

public class Params {

    @CommandLine.Option(names = {"-i", "--project-id"}, paramLabel = "...", description = "Numerical ID of the project")
    private String idParam;

    @CommandLine.Option(names = {"-pat", "--token"}, paramLabel = "...", description = "Personal access token required for authentication")
    private String tokenParam;

    @CommandLine.Option(names = {"--base-url"}, paramLabel = "...", description = "Base URL of Crowdin server for API requests execution")
    private String baseUrlParam;

    @CommandLine.Option(names = {"--base-path"}, paramLabel = "...", description = "Path to your project directory on a local machine")
    private String basePathParam;

    @CommandLine.Option(names = {"-s", "--source"}, paramLabel = "...", description = "Path to the source files")
    private String sourceParam;

    @CommandLine.Option(names = {"-t", "--translation"}, paramLabel = "...", description = "Path to the translation files")
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
