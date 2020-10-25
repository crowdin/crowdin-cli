package com.crowdin.cli.properties;

import lombok.Data;
import picocli.CommandLine;

@Data
public class Params {

    @CommandLine.Option(names = {"-T", "--token"}, paramLabel = "...", descriptionKey = "params.token")
    private String tokenParam;

    @CommandLine.Option(names = {"--base-url"}, paramLabel = "...", descriptionKey = "params.base-url")
    private String baseUrlParam;

    @CommandLine.Option(names = {"--base-path"}, paramLabel = "...", descriptionKey = "params.base-path")
    private String basePathParam;
}
