package com.crowdin.cli.properties;

import lombok.Data;
import lombok.EqualsAndHashCode;
import picocli.CommandLine;

@EqualsAndHashCode(callSuper = true)
@Data
public class ProjectParams extends BaseParams {

    @CommandLine.Option(names = {"-i", "--project-id"}, paramLabel = "...", descriptionKey = "params.project-id")
    private String idParam;
    
}
