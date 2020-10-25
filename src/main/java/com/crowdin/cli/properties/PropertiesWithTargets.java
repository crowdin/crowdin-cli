package com.crowdin.cli.properties;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

@EqualsAndHashCode(callSuper = true)
@Data
public class PropertiesWithTargets extends IdProperties {

    private List<TargetBean> targets;
}
