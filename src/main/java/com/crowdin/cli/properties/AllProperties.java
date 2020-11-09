package com.crowdin.cli.properties;

import lombok.Data;

@Data
public class AllProperties implements Properties {

    private IdProperties idProperties = new IdProperties();
    private PropertiesWithFiles propertiesWithFiles = new PropertiesWithFiles();
    private PropertiesWithTargets propertiesWithTargets = new PropertiesWithTargets();
}
