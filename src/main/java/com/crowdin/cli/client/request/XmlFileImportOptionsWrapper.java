package com.crowdin.cli.client.request;

import com.crowdin.common.request.XmlFileImportOptions;

import java.util.List;

public class XmlFileImportOptionsWrapper extends XmlFileImportOptions {

    public XmlFileImportOptionsWrapper(
        boolean contentSegmentation,
        boolean translateAttributes,
        boolean translateContent,
        List<String> translatableElements
    ) {
        setContentSegmentation(contentSegmentation);
        setTranslateAttributes(translateAttributes);
        setTranslateContent(translateContent);
        setTranslatableElements(translatableElements);
    }
}
