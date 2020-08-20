package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.client.glossaries.model.Glossary;
import com.crowdin.client.glossaries.model.Term;

import java.util.List;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class GlossaryListAction implements ClientAction {

    private final boolean isVerbose;
    private final boolean plainView;

    public GlossaryListAction(boolean plainView, boolean isVerbose) {
        this.plainView = plainView;
        this.isVerbose = isVerbose;
    }

    @Override
    public void act(Outputter out, PropertiesBean pb, Client client) {
        List<Glossary> glossaries = client.listGlossaries();
        for (Glossary glossary : glossaries) {
            if (!plainView) {
                out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.glossary.list"), glossary.getName(), glossary.getId(), glossary.getTerms())));
                if (isVerbose) {
                    List<Term> terms = client.listTerms(glossary.getId());
                    for (Term term : terms) {
                        out.println(String.format(RESOURCE_BUNDLE.getString("message.glossary.list_term"), term.getId(), term.getText(), term.getDescription()));
                    }
                }
            } else {
                out.println(glossary.getName());
            }
        }
    }
}
