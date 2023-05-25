package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientComment;
import com.crowdin.cli.client.ClientTask;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.bundles.model.Bundle;
import com.crowdin.client.stringcomments.model.IssueStatus;
import com.crowdin.client.stringcomments.model.StringComment;
import com.crowdin.client.stringcomments.model.Type;
import com.crowdin.client.tasks.model.Status;
import com.crowdin.client.tasks.model.Task;

import java.util.List;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

class CommentListAction implements NewAction<ProjectProperties, ClientComment> {

    private final boolean plainView;
    private final boolean isVerbose;
    private String stringId;
    private com.crowdin.client.stringcomments.model.Type type;
    private com.crowdin.client.issues.model.Type issueType;
    private IssueStatus status;

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
        List<StringComment> comments = client.listComment(stringId, type, issueType, status);
        for (StringComment comment : comments) {
            String okMessage = isVerbose ? "message.comment.list.verbose" : "message.comment.list";
            if (!plainView) {
                if (isVerbose) {
                    out.println(String.format(RESOURCE_BUNDLE.getString(okMessage), comment.getId(), comment.getText(),
                                              comment.getIssueType(), comment.getIssueStatus()));
                } else {
                    out.println(
                            String.format(RESOURCE_BUNDLE.getString(okMessage), comment.getId(), comment.getText()));
                }
            } else {
                out.println(comment.getId().toString());
            }
        }
        if (comments.isEmpty()) {
            if (!plainView) {
                out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.comment.list_empty")));
            } else {
                out.println(RESOURCE_BUNDLE.getString("message.comment.list_empty"));
            }
        }
    }
}
