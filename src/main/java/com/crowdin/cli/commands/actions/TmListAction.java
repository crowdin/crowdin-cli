package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.client.translationmemory.model.TranslationMemory;

import java.util.List;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class TmListAction implements ClientAction {

    private final boolean plainView;

    public TmListAction(boolean plainView) {
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, PropertiesBean pb, Client client) {
        List<TranslationMemory> tms = client.listTms();
        for (TranslationMemory tm : tms) {
            if (!plainView) {
                out.println(OK.withIcon(
                    String.format(RESOURCE_BUNDLE.getString("message.tm.list"), tm.getName(), tm.getId(), tm.getSegmentsCount())));
            } else {
                out.println(tm.getName());
            }
        }
        if (tms.isEmpty()) {
            if (!plainView) {
                out.println(OK.withIcon(RESOURCE_BUNDLE.getString("message.tm.list_empty")));
            }
        }
    }
}
