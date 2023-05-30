package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientComment;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.stringcomments.model.IssueStatus;
import com.crowdin.client.stringcomments.model.StringComment;

import java.util.List;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.client.stringcomments.model.IssueStatus.RESOLVED;
import static com.crowdin.client.stringcomments.model.Type.ISSUE;

class CommentListAction implements NewAction<ProjectProperties, ClientComment> {

    private final boolean plainView;
    private final boolean isVerbose;
    private final String stringId;
    private com.crowdin.client.stringcomments.model.Type type;
    private final com.crowdin.client.issues.model.Type issueType;
    private final IssueStatus status;

    public CommentListAction(boolean plainView, boolean isVerbose, String stringId,
                             com.crowdin.client.stringcomments.model.Type type,
                             com.crowdin.client.issues.model.Type issueType,
                             IssueStatus status) {
        this.plainView = plainView;
        this.isVerbose = isVerbose;
        this.stringId = stringId;
        this.type = type;
        this.issueType = issueType;
        this.status = status;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientComment client) {
        if (status == RESOLVED && type == null) {
            type = ISSUE;
        }

        List<StringComment> comments = client.listComment(stringId, type, issueType, status);

        for (StringComment comment : comments) {
            if (plainView) {
                out.println(comment.getId().toString());

                continue;
            }

            // Replace line breaks
            String commentText = comment.getText().replaceAll("\\s+", " ");

            if (isVerbose) {
                out.println(
                    String.format(
                        RESOURCE_BUNDLE.getString("message.comment.list.verbose"),
                        comment.getId(),
                        commentText,
                        comment.getIssueType() != null ? comment.getIssueType() : "",
                        comment.getIssueStatus() != null ? comment.getIssueStatus() : ""
                    )
                );
            } else {
                out.println(
                    String.format(
                        RESOURCE_BUNDLE.getString("message.comment.list"),
                        comment.getId(),
                        commentText
                    )
                );
            }
        }

        if (comments.isEmpty()) {
            if (!plainView) {
                out.println(OK.withIcon(RESOURCE_BUNDLE.getString("message.comment.list_empty")));
            } else {
                out.println(RESOURCE_BUNDLE.getString("message.comment.list_empty"));
            }
        }
    }
}
