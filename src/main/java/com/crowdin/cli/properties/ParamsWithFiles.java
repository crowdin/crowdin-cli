package com.crowdin.cli.properties;

import lombok.Data;
import lombok.EqualsAndHashCode;
import picocli.CommandLine;

import java.util.List;

@EqualsAndHashCode(callSuper = true)
@Data
public class ParamsWithFiles extends ProjectParams {

    @CommandLine.Option(names = {"-s", "--source"}, paramLabel = "...", descriptionKey = "params.source")
    private String sourceParam;

    @CommandLine.Option(names = {"-t", "--translation"}, paramLabel = "...", descriptionKey = "params.translation")
    private String translationParam;

    @CommandLine.Option(names = {"--dest"}, paramLabel = "...", descriptionKey = "params.dest")
    private String destParam;

    @CommandLine.Option(names = {"--preserve-hierarchy"}, negatable = true, paramLabel = "...", descriptionKey = "params.preserve-hierarchy")
    private Boolean preserveHierarchy;

    private Boolean skipTranslatedOnly;
    private Boolean skipUntranslatedFiles;
    private Boolean exportApprovedOnly;

    private List<String> labels;

    private List<String> excludedTargetLanguages;

    public void setExportOptions(Boolean skipTranslatedOnly, Boolean skipUntranslatedFiles, Boolean exportApprovedOnly) {
        this.skipTranslatedOnly = skipTranslatedOnly;
        this.skipUntranslatedFiles = skipUntranslatedFiles;
        this.exportApprovedOnly = exportApprovedOnly;
    }

    public void setLabels(List<String> labels) {
        this.labels = labels;
    }

    public boolean isEmpty() {
        return sourceParam == null && translationParam == null;
    }
}
