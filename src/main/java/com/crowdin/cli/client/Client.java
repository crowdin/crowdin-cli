package com.crowdin.cli.client;

import com.crowdin.cli.utils.Utils;
import com.crowdin.client.CrowdinRequestBuilder;
import com.crowdin.common.Settings;
import com.crowdin.common.response.Page;
import com.crowdin.common.response.SimpleResponse;
import com.crowdin.util.PaginationUtil;

import java.util.List;

class Client {

    protected Settings settings;
    protected String userAgent = Utils.buildUserAgent();

    Client(Settings settings) {
        this.settings = settings;
    }

    protected <T> T execute(CrowdinRequestBuilder<SimpleResponse<T>> requestBuilder) {
        return requestBuilder.header("User-Agent", userAgent).getResponseEntity().getEntity();
    }

    protected <T> List<T> executePage(CrowdinRequestBuilder<Page<T>> requestBuilder) {
        return PaginationUtil.unpaged(requestBuilder.header("User-Agent", userAgent));
    }
}
