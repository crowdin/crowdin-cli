package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientTm;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.client.translationmemory.model.TranslationMemory;

import java.util.List;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class TmListAction implements NewAction<BaseProperties, ClientTm> {

    private final boolean plainView;

    public TmListAction(boolean plainView) {
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, BaseProperties pb, ClientTm client) {
        List<TranslationMemory> tms = client.listTms();
        for (TranslationMemory tm : tms) {
            if (!plainView) {
                out.println(
                    String.format(RESOURCE_BUNDLE.getString("message.tm.list"), tm.getId(), tm.getName(), tm.getSegmentsCount()));
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
