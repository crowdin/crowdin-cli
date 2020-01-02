package com.crowdin.cli.client.request;

import com.crowdin.common.request.SpreadsheetFileImportOptions;

import java.util.Map;

public class SpreadsheetFileImportOptionsWrapper extends SpreadsheetFileImportOptions {

    public SpreadsheetFileImportOptionsWrapper(
        boolean importTranslations,
        boolean firstLineContainsHeader,
        Map<String, Integer> scheme
    ) {
        setImportTranslations(importTranslations);
        setFirstLineContainsHeader(firstLineContainsHeader);
        setScheme(scheme);
    }
}
