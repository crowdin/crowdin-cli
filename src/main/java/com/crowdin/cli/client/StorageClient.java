package com.crowdin.cli.client;

import com.crowdin.client.api.StorageApi;
import com.crowdin.common.Settings;

import java.io.File;

public class StorageClient extends ClientOld {

    public StorageClient(Settings settings) {
        super(settings);
    }

    public Long uploadStorage(File file, String fileName) {
        return execute((new StorageApi(settings)).uploadFile(file, fileName)).getId();
    }
}
