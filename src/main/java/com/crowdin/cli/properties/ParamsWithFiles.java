package com.crowdin.cli.properties;

import lombok.Data;
import lombok.EqualsAndHashCode;
import picocli.CommandLine;

@EqualsAndHashCode(callSuper = true)
@Data
public class ParamsWithFiles extends ProjectParams {

    @CommandLine.Option(names = {"-s", "--source"}, paramLabel = "...", descriptionKey = "params.source")
    private String sourceParam;

    @CommandLine.Option(names = {"-t", "--translation"}, paramLabel = "...", descriptionKey = "params.translation")
    private String translationParam;
}
