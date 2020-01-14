package com.crowdin.cli.client.request;

import com.crowdin.common.request.PropertyFileExportOptions;

public class PropertyFileExportOptionsWrapper extends PropertyFileExportOptions {

    public PropertyFileExportOptionsWrapper(
            int escapeQuotes,
            String translations
    ) {
        setEscapeQuotes(escapeQuotes);
        setExportPattern(translations);
    }

    public PropertyFileExportOptionsWrapper(String translations) {
        setExportPattern(translations);
    }
}
