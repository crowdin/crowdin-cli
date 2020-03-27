package com.crowdin.cli.client.request;

import com.crowdin.common.request.DirectoryPayload;

public class DirectoryPayloadWrapper extends DirectoryPayload {

    public DirectoryPayloadWrapper(String name, Long directoryId, Long branchId) {
        setName(name);
        setDirectoryId(directoryId);
        setBranchId(branchId);
    }
}
