package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientComment;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.stringcomments.model.IssueStatus;
import picocli.CommandLine;

@CommandLine.Command(
        sortOptions = false,
        name = CommandNames.COMMENT_LIST
)
class CommentListSubcommand extends ActCommandComment {

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @CommandLine.Option(names = {"--string-id"}, paramLabel = "...", descriptionKey = "crowdin.comment.list.string-id", order = -2)
    private String stringId;

    @CommandLine.Option(names = {"--type"}, paramLabel = "...", descriptionKey = "crowdin.comment.list.type", order = -2)
    private com.crowdin.client.stringcomments.model.Type type;

    @CommandLine.Option(names = {"--issue-type"}, paramLabel = "...", descriptionKey = "crowdin.comment.list.issue-type", order = -2)
    private com.crowdin.client.issues.model.Type issueType;

    @CommandLine.Option(names = {"--status"}, paramLabel = "...", descriptionKey = "crowdin.comment.list.status", order = -2)
    private IssueStatus status;

    @Override
    protected NewAction<ProjectProperties, ClientComment> getAction(Actions actions) {
        return actions.commentList(this.plainView, this.isVerbose, stringId, type, issueType, status);
    }

    @Override
    protected boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }
}
