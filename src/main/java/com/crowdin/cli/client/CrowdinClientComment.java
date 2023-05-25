package com.crowdin.cli.client;

import com.crowdin.client.core.model.PatchOperation;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.stringcomments.model.AddStringCommentRequest;
import com.crowdin.client.stringcomments.model.IssueStatus;
import com.crowdin.client.stringcomments.model.StringComment;
import com.crowdin.client.stringcomments.model.Type;
import com.crowdin.client.tasks.model.AddTaskRequest;
import com.crowdin.client.tasks.model.Status;
import com.crowdin.client.tasks.model.Task;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class CrowdinClientComment extends CrowdinClientCore implements ClientComment {

    private final com.crowdin.client.Client client;
    private final String projectId;

    public CrowdinClientComment(com.crowdin.client.Client client, String projectId) {
        this.client = client;
        this.projectId = projectId;
    }

    @Override
    public List<StringComment> listComment(String stringId, com.crowdin.client.stringcomments.model.Type type,
                                           com.crowdin.client.issues.model.Type issueType, IssueStatus issueStatus) {
        return executeRequestFullList((limit, offset) -> this.client.getStringCommentsApi()
                .listStringComments(Long.valueOf(projectId), stringId == null ? null : Long.valueOf(stringId), limit,
                                    offset, type, issueType == null ? null :issueType.toString(), issueStatus));
    }


    @Override
    public StringComment resolve(Long commentId) {
        PatchRequest patchRequest = new PatchRequest();
        patchRequest.setOp(PatchOperation.REPLACE);
        patchRequest.setPath("/issueStatus");
        patchRequest.setValue(IssueStatus.RESOLVED);
        return executeRequest(() -> this.client.getStringCommentsApi()
                .editStringComment(Long.valueOf(projectId), commentId, Arrays.asList(patchRequest)).getData());
    }

}
