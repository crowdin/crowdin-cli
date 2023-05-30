package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientComment;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
        name = CommandNames.COMMENT_RESOLVE
)
class CommentResolveSubcommand extends ActCommandComment {

    @CommandLine.Parameters(descriptionKey = "crowdin.comment.resolve.id")
    protected Long id;

    @Override
    protected NewAction<ProjectProperties, ClientComment> getAction(Actions actions) {
        return actions.resolve(id);
    }
}
