package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientTm;
import com.crowdin.cli.properties.BaseProperties;

public abstract class ActCommandTm extends ActCommand<ClientTm> {

    @Override
    protected ClientTm getClient(BaseProperties properties) {
        return GenericActCommand.getTmClient(properties);
    }
}
