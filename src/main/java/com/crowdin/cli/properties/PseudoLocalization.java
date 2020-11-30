package com.crowdin.cli.properties;

import com.crowdin.client.translations.model.CharTransformation;
import lombok.Data;
import lombok.NonNull;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

@Data
public class PseudoLocalization {

    static PseudoLocalizationConfigurator CONFIGURATOR = new PseudoLocalizationConfigurator();

    private Integer lengthCorrection;
    private String prefix;
    private String suffix;
    private CharTransformation charTransformation;

    static class PseudoLocalizationConfigurator implements BeanConfigurator<PseudoLocalization> {

        private PseudoLocalizationConfigurator() {

        }

        @Override
        public PseudoLocalization buildFromMap(Map<String, Object> map) {
            if (map == null) {
                return null;
            }
            PseudoLocalization pl = new PseudoLocalization();
            PropertiesBuilder.setPropertyIfExists(pl::setLengthCorrection, map, PropertiesBuilder.LENGTH_CORRECTION, Integer.class);
            PropertiesBuilder.setPropertyIfExists(pl::setPrefix, map, PropertiesBuilder.PREFIX, String.class);
            PropertiesBuilder.setPropertyIfExists(pl::setSuffix, map, PropertiesBuilder.SUFFIX, String.class);
            PropertiesBuilder.setEnumPropertyIfExists(
                v -> pl.setCharTransformation(CharTransformation.valueOf(v.toUpperCase())),
                map, PropertiesBuilder.CHARACTER_TRANSFORMATION, "\"asian\", \"cyrillic\", \"european\", \"arabic\"");
            return pl;
        }

        @Override
        public List<String> checkProperties(@NonNull PseudoLocalization bean) {
            List<String> errors = new ArrayList<>();
            if (bean.getLengthCorrection() != null) {
                if (bean.getLengthCorrection() < -50 || bean.getLengthCorrection() > 100) {
                    errors.add(RESOURCE_BUNDLE.getString("error.config.pseudo_localization_length_correction_out_of_bounds"));
                }
            }
            return errors;
        }
    }
}
