package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.actions.Action;
import com.crowdin.cli.commands.actions.Outputter;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

abstract class ActCommand extends GenericCommand {

    @Override
    public final void run() {
        List<String> errors = checkOptions();
        if (errors != null && !errors.isEmpty()) {
            String errorsInOne = errors.stream()
                .map(error -> String.format(RESOURCE_BUNDLE.getString("message.item_list"), error))
                .collect(Collectors.joining("\n"));
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.params_are_invalid") + "\n" + errorsInOne);
        }
        Outputter out = new PicocliOutputter(System.out, isAnsi());
        Action action = getAction();
        action.act(out);
    }

    protected abstract Action getAction();

    protected List<String> checkOptions() {
        return Collections.emptyList();
    }

    protected boolean isAnsi() {
        return !this.noColors;
    }
}
