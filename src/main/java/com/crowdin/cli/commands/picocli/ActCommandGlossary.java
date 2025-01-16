package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientGlossary;
import com.crowdin.cli.properties.BaseProperties;

public abstract class ActCommandGlossary extends ActCommand<ClientGlossary> {

    @Override
    protected ClientGlossary getClient(BaseProperties properties) {
        return GenericActCommand.getGlossaryClient(properties);
    }
}
