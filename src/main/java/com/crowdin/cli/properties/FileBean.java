package com.crowdin.cli.properties;

import java.util.List;
import java.util.Map;
import java.util.Objects;


public class FileBean {
    private String source;

    private String translation;

    private List<String> ignore;

    private String dest;

    private String type;

    private String updateOption;

    private Map<String, Map<String, String>> languagesMapping;

    private Boolean firstLineContainsHeader;

    private String scheme;

    private Boolean multilingualSpreadsheet;

    private Boolean translateAttributes;

    private Boolean translateContent;

    private List<String> translatableElements;

    private Boolean contentSegmentation;

    private Integer escapeQuotes;

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        FileBean fileBean = (FileBean) o;
        return Objects.equals(source, fileBean.source)
            && Objects.equals(translation, fileBean.translation)
            && Objects.equals(ignore, fileBean.ignore)
            && Objects.equals(dest, fileBean.dest)
            && Objects.equals(type, fileBean.type)
            && Objects.equals(updateOption, fileBean.updateOption)
            && Objects.equals(languagesMapping, fileBean.languagesMapping)
            && Objects.equals(firstLineContainsHeader, fileBean.firstLineContainsHeader)
            && Objects.equals(scheme, fileBean.scheme)
            && Objects.equals(multilingualSpreadsheet, fileBean.multilingualSpreadsheet)
            && Objects.equals(translateAttributes, fileBean.translateAttributes)
            && Objects.equals(translateContent, fileBean.translateContent)
            && Objects.equals(translatableElements, fileBean.translatableElements)
            && Objects.equals(contentSegmentation, fileBean.contentSegmentation)
            && Objects.equals(escapeQuotes, fileBean.escapeQuotes)
            && Objects.equals(escapeSpecialCharacters, fileBean.escapeSpecialCharacters)
            && Objects.equals(translationReplace, fileBean.translationReplace);
    }

    @Override
    public int hashCode() {
        return Objects.hash(
            source, translation, ignore, dest, type, updateOption, languagesMapping, firstLineContainsHeader,
            scheme, multilingualSpreadsheet, translateAttributes, translateContent, translatableElements,
            contentSegmentation, escapeQuotes, escapeSpecialCharacters, translationReplace);
    }

    @Override
    public String toString() {
        return "FileBean{"
            + "source='" + source + '\''
            + ", translation='" + translation + '\''
            + ", ignore=" + ignore
            + ", dest='" + dest + '\''
            + ", type='" + type + '\''
            + ", updateOption='" + updateOption + '\''
            + ", languagesMapping=" + languagesMapping
            + ", firstLineContainsHeader=" + firstLineContainsHeader
            + ", scheme='" + scheme + '\''
            + ", multilingualSpreadsheet=" + multilingualSpreadsheet
            + ", translateAttributes=" + translateAttributes
            + ", translateContent=" + translateContent
            + ", translatableElements=" + translatableElements
            + ", contentSegmentation=" + contentSegmentation
            + ", escapeQuotes=" + escapeQuotes
            + ", escapeSpecialCharacters=" + escapeSpecialCharacters
            + ", translationReplace=" + translationReplace
            + '}';
    }

    private Integer escapeSpecialCharacters;

    private Map<String, String> translationReplace;

    public FileBean() {

    }

    public FileBean(String source, String translation) {
        this.source = source;
        this.translation = translation;
    }

    public String getTranslation() {
        return translation;
    }

    public void setTranslation(String translation) {
        this.translation = translation;
    }

    public Map<String, Map<String, String>> getLanguagesMapping() {
        return languagesMapping;
    }

    public void setLanguagesMapping(Map<String, Map<String, String>> languagesMapping) {
        this.languagesMapping = languagesMapping;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public List<String> getIgnore() {
        return ignore;
    }

    public void setIgnore(List<String> ignore) {
        this.ignore = ignore;
    }

    public String getDest() {
        return dest;
    }

    public void setDest(String dest) {
        this.dest = dest;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getUpdateOption() {
        return updateOption;
    }

    public void setUpdateOption(String updateOption) {
        this.updateOption = updateOption;
    }

    public Boolean getFirstLineContainsHeader() {
        return firstLineContainsHeader;
    }

    public void setFirstLineContainsHeader(Boolean firstLineContainsHeader) {
        this.firstLineContainsHeader = firstLineContainsHeader;
    }

    public String getScheme() {
        return scheme;
    }

    public void setScheme(String scheme) {
        this.scheme = scheme;
    }

    public Boolean getMultilingualSpreadsheet() {
        return multilingualSpreadsheet;
    }

    public void setMultilingualSpreadsheet(Boolean multilingualSpreadsheet) {
        this.multilingualSpreadsheet = multilingualSpreadsheet;
    }

    public Boolean getTranslateAttributes() {
        return translateAttributes;
    }

    public void setTranslateAttributes(Boolean translateAttributes) {
        this.translateAttributes = translateAttributes;
    }

    public Boolean getTranslateContent() {
        return translateContent;
    }

    public void setTranslateContent(Boolean translateContent) {
        this.translateContent = translateContent;
    }

    public List<String> getTranslatableElements() {
        return translatableElements;
    }

    public void setTranslatableElements(List<String> translatableElements) {
        this.translatableElements = translatableElements;
    }

    public Boolean getContentSegmentation() {
        return contentSegmentation;
    }

    public void setContentSegmentation(Boolean contentSegmentation) {
        this.contentSegmentation = contentSegmentation;
    }

    public Integer getEscapeQuotes() {
        return escapeQuotes;
    }

    public void setEscapeQuotes(Integer escapeQuotes) {
        this.escapeQuotes = escapeQuotes;
    }

    public Integer getEscapeSpecialCharacters() {
        return escapeSpecialCharacters;
    }

    public void setEscapeSpecialCharacters(Integer escapeSpecialCharacters) {
        this.escapeSpecialCharacters = escapeSpecialCharacters;
    }

    public Map<String, String> getTranslationReplace() {
        return translationReplace;
    }

    public void setTranslationReplace(Map<String, String> translationReplace) {
        this.translationReplace = translationReplace;
    }
}