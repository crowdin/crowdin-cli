package com.crowdin.cli.properties;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

@EqualsAndHashCode(callSuper = true)
@Data
public class PropertiesWithFiles extends IdProperties {

    private Boolean preserveHierarchy;

    private List<FileBean> files;
}
