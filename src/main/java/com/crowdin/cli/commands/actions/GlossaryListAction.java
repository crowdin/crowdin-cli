package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientGlossary;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.client.glossaries.model.Glossary;
import com.crowdin.client.glossaries.model.Term;

import java.util.List;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

class GlossaryListAction implements NewAction<BaseProperties, ClientGlossary> {

    private final boolean isVerbose;
    private final boolean plainView;

    public GlossaryListAction(boolean plainView, boolean isVerbose) {
        this.plainView = plainView;
        this.isVerbose = isVerbose;
    }

    @Override
    public void act(Outputter out, BaseProperties pb, ClientGlossary client) {
        List<Glossary> glossaries = client.listGlossaries();
        for (Glossary glossary : glossaries) {
            if (!plainView) {
                out.println(OK.withIcon(
                    String.format(RESOURCE_BUNDLE.getString("message.glossary.list"), glossary.getName(), glossary.getId(), glossary.getTerms())));
                if (isVerbose && mayHaveTerms(glossary)) {
                    try {
                        List<Term> terms = client.listTerms(glossary.getId());
                        for (Term term : terms) {
                            String description = (term.getDescription() != null) ? term.getDescription() : "";
                            out.println(String.format(
                                RESOURCE_BUNDLE.getString("message.glossary.list_term"), term.getId(), term.getText(), description));
                        }
                    } catch (Exception e) {
                        out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("error.glossary.no_permission")));
                    }
                }
            } else {
                out.println(glossary.getName());
            }
        }
    }

    private boolean mayHaveTerms(Glossary glossary) {
        return glossary != null && (glossary.getTerms() == null || glossary.getTerms() > 0);
    }
}
