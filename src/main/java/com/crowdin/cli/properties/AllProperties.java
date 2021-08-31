package com.crowdin.cli.properties;

import lombok.Data;

@Data
public class AllProperties implements Properties {

    private ProjectProperties projectProperties = new ProjectProperties();
    private PropertiesWithFiles propertiesWithFiles = new PropertiesWithFiles();
    private PropertiesWithTargets propertiesWithTargets = new PropertiesWithTargets();
}
