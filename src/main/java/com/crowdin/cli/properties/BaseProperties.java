package com.crowdin.cli.properties;

import lombok.Data;

@Data
public class BaseProperties implements Properties {

    private String apiToken;

    private String basePath;

    private String baseUrl;
}
