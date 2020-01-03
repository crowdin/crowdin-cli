package com.crowdin.cli.client.request;

import com.crowdin.common.request.ExportOptions;
import com.crowdin.common.request.ImportOptions;
import com.crowdin.common.request.UpdateFilePayload;

public class UpdateFilePayloadWrapper extends UpdateFilePayload {

    public  UpdateFilePayloadWrapper(Long storageId, ExportOptions exportOptions, ImportOptions importOptions) {
        setStorageId(storageId);
        setExportOptions(exportOptions);
        setImportOptions(importOptions);
    }
}
