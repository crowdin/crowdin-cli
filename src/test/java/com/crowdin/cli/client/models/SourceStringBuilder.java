package com.crowdin.cli.client.models;

import com.crowdin.client.sourcestrings.model.SourceString;

import java.text.ParseException;
import java.text.SimpleDateFormat;

public class SourceStringBuilder {

    private SourceString ss;

    public static SourceStringBuilder standard() {
        SourceString ss = new SourceString();
        ss.setRevision(1);
        ss.setHidden(false);
        ss.setHasPlurals(false);
        ss.setIcu(false);
        ss.setType("string");
        ss.setMaxLength(42);
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX");
        try {
            ss.setUpdatedAt(dateFormat.parse("2020-03-20T15:44:03+00:00"));
            ss.setCreatedAt(dateFormat.parse("2020-03-20T15:44:03+00:00"));
        } catch (ParseException e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
        return new SourceStringBuilder(ss);
    }

    protected SourceStringBuilder(SourceString ss) {
        this.ss = ss;
    }

    public SourceStringBuilder setProjectId(Long projectId) {
        ss.setProjectId(projectId);
        return this;
    }

    public SourceStringBuilder setIdentifiers(Long id, String text, String context, String identifier, Long fileId) {
        ss.setId(id);
        ss.setText(text);
        ss.setContext(context);
        ss.setIdentifier(identifier);
        ss.setFileId(fileId);
        return this;
    }

    public SourceString build() {
        return ss;
    }
}
