package com.crowdin.cli.properties;

import com.crowdin.client.translations.model.CharTransformation;
import lombok.Data;

import java.util.Map;

@Data
public class PseudoLocalization {

    private Integer lengthCorrection;
    private String prefix;
    private String suffix;
    private CharTransformation charTransformation;

    static PseudoLocalization buildFromMap(Map<String, Object> map) {
        if (map == null) {
            return null;
        }
        PseudoLocalization pl = new PseudoLocalization();
        PropertiesBuilder.setPropertyIfExists(pl::setLengthCorrection, map, PropertiesBuilder.LENGTH_CORRECTION);
        PropertiesBuilder.setPropertyIfExists(pl::setPrefix, map, PropertiesBuilder.PREFIX);
        PropertiesBuilder.setPropertyIfExists(pl::setSuffix, map, PropertiesBuilder.SUFFIX);
        PropertiesBuilder.setEnumPropertyIfExists(
            v -> pl.setCharTransformation(CharTransformation.valueOf(v.toUpperCase())),
            map, PropertiesBuilder.CHARACTER_TRANSFORMATION, "\"asian\", \"cyrillic\", \"european\", \"arabic\"");
        return pl;
    }

}
