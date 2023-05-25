package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientComment;
import com.crowdin.cli.client.ClientTask;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.bundles.model.Bundle;
import com.crowdin.client.stringcomments.model.AddStringCommentRequest;
import com.crowdin.client.stringcomments.model.IssueStatus;
import com.crowdin.client.stringcomments.model.StringComment;
import com.crowdin.client.tasks.model.AddTaskRequest;
import com.crowdin.client.tasks.model.CrowdinTaskCreateFormRequest;
import com.crowdin.client.tasks.model.EnterpriseTaskCreateFormRequest;
import com.crowdin.client.tasks.model.Task;
import lombok.AllArgsConstructor;

import java.util.List;
import java.util.Optional;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@AllArgsConstructor
class CommentResolveAction implements NewAction<ProjectProperties, ClientComment> {

    private Long id;

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientComment client) {
        StringComment stringComment;
        try {
            stringComment = client.resolve(id);
        } catch (Exception e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.comment_is_not_resolved"), id), e);
        }
        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.comment.resolved"),
                                              stringComment.getId())));

    }
}
