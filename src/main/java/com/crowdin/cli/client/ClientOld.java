package com.crowdin.cli.client;

import com.crowdin.cli.utils.Utils;
import com.crowdin.client.CrowdinRequestBuilder;
import com.crowdin.common.Settings;
import com.crowdin.common.response.Page;
import com.crowdin.common.response.SimpleResponse;
import com.crowdin.util.PaginationUtil;
import org.apache.commons.lang3.StringUtils;

import java.util.List;

class ClientOld {

    protected Settings settings;
    private String userAgent = Utils.buildUserAgent();
    private long millisToRetry = 100;

    ClientOld(Settings settings) {
        this.settings = settings;
    }

    protected <T> T execute(CrowdinRequestBuilder<SimpleResponse<T>> requestBuilder) {
        return requestBuilder.header("User-Agent", userAgent).getResponseEntity().getEntity();
    }

    protected <T> List<T> executePage(CrowdinRequestBuilder<Page<T>> requestBuilder) {
        return PaginationUtil.unpaged(requestBuilder.header("User-Agent", userAgent));
    }

    protected <T> T executeWithRetryIfErrorContains(CrowdinRequestBuilder<SimpleResponse<T>> requestBuilder, String errorMessageContains) {
        try {
            return execute(requestBuilder);
        } catch (Exception e) {
            if (StringUtils.contains(e.getMessage(), errorMessageContains)) {
                try {
                    Thread.sleep(millisToRetry);
                } catch (InterruptedException ee) {
                }
                return execute(requestBuilder);
            } else {
                throw new RuntimeException(e.getMessage());
            }
        }
    }
}
