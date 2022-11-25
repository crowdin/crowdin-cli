package com.crowdin.cli.properties;

import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class ParamsWithTargets extends ProjectParams {

    private Boolean skipTranslatedOnly;
    private Boolean skipUntranslatedFiles;
    private Boolean exportApprovedOnly;

    public void setExportOptions(Boolean skipTranslatedOnly, Boolean skipUntranslatedFiles, Boolean exportApprovedOnly) {
        this.skipTranslatedOnly = skipTranslatedOnly;
        this.skipUntranslatedFiles = skipUntranslatedFiles;
        this.exportApprovedOnly = exportApprovedOnly;
    }
}
