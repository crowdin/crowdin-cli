package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Action;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.Outputter;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

abstract class ActCommand extends GenericCommand {

    @Override
    public final void act(Actions actions, Outputter out) {
        Action action = getAction(actions);
        action.act(out);
    }

    protected abstract Action getAction(Actions actions);

    protected List<String> checkOptions() {
        return Collections.emptyList();
    }

    protected boolean isAnsi() {
        return !this.noColors;
    }
}
