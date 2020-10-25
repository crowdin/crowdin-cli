package com.crowdin.cli.properties;

import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class IdProperties extends BaseProperties {

    private String projectId;

}
