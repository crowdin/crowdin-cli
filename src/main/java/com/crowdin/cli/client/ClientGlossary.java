package com.crowdin.cli.client;

import com.crowdin.client.glossaries.model.AddGlossaryRequest;
import com.crowdin.client.glossaries.model.ExportGlossaryRequest;
import com.crowdin.client.glossaries.model.Glossary;
import com.crowdin.client.glossaries.model.GlossaryExportStatus;
import com.crowdin.client.glossaries.model.GlossaryImportStatus;
import com.crowdin.client.glossaries.model.ImportGlossaryRequest;
import com.crowdin.client.glossaries.model.Term;

import java.io.InputStream;
import java.net.URL;
import java.util.List;
import java.util.Optional;

public interface ClientGlossary extends Client {

    List<Glossary> listGlossaries();

    Optional<Glossary> getGlossary(Long glossaryId);

    Glossary addGlossary(AddGlossaryRequest request);

    GlossaryImportStatus importGlossary(Long glossaryId, ImportGlossaryRequest request);

    GlossaryExportStatus startExportingGlossary(Long glossaryId, ExportGlossaryRequest request);

    GlossaryExportStatus checkExportingGlossary(Long glossaryId, String exportId);

    URL downloadGlossary(Long glossaryId, String exportId);

    List<Term> listTerms(Long glossaryId);

    Long uploadStorage(String fileName, InputStream content);
}
