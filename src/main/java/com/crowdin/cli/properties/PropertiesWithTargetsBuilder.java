package com.crowdin.cli.properties;

import com.crowdin.cli.utils.Utils;
import lombok.NonNull;
import org.apache.commons.lang3.StringUtils;

import java.io.IOException;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

public class PropertiesWithTargetsBuilder extends PropertiesBuilder<PropertiesWithTargets, ProjectParams> {
    @Override
    protected PropertiesWithTargets getEmptyInstance() {
        return new PropertiesWithTargets();
    }

    @Override
    protected void populateWithIdentityFileParams(PropertiesWithTargets props, @NonNull Map<String, Object> identityFileParams) {
        setEnvOrPropertyIfExists(props::setApiToken,    identityFileParams,     API_TOKEN_ENV,  API_TOKEN);
        setEnvOrPropertyIfExists(props::setBasePath,    identityFileParams,     BASE_PATH_ENV,  BASE_PATH);
        setEnvOrPropertyIfExists(props::setBaseUrl,     identityFileParams,     BASE_URL_ENV,   BASE_URL);
        setEnvOrPropertyIfExists(props::setProjectId,   identityFileParams,     PROJECT_ID_ENV,  PROJECT_ID);
    }

    @Override
    protected void populateWithConfigFileParams(PropertiesWithTargets props, @NonNull Map<String, Object> configFileParams) {
        populateWithIdentityFileParams(props, configFileParams);
        props.setTargets(((List<Map<String, Object>>) configFileParams.getOrDefault(TARGETS, Collections.EMPTY_LIST))
            .stream()
            .map(PropertiesWithTargetsBuilder::buildTargetBeanFromMap)
            .collect(Collectors.toList()));
    }

    private static TargetBean buildTargetBeanFromMap(Map<String, Object> tbProperties) {
        TargetBean tb = new TargetBean();
        setPropertyIfExists(tb::setName, tbProperties, NAME);
        tb.setFiles(((List<Map<String, Object>>) tbProperties.getOrDefault(FILES, Collections.EMPTY_LIST))
            .stream()
            .map(PropertiesWithTargetsBuilder::buildTargetFileBeanFromMap)
            .collect(Collectors.toList()));
        return tb;
    }

    private static TargetBean.FileBean buildTargetFileBeanFromMap(Map<String, Object> fbProperties) {
        TargetBean.FileBean fb = new TargetBean.FileBean();
        setPropertyIfExists(fb::setTarget, fbProperties, TARGET);
        setPropertyIfExists(fb::setSources, fbProperties, SOURCES);
        setPropertyIfExists(fb::setSourceDirs, fbProperties, SOURCEDIRS);
        setPropertyIfExists(fb::setSourceBranches, fbProperties, SOURCEBRANCHES);
        setPropertyIfExists(fb::setLabels, fbProperties, LABELS);
        return fb;
    }

    @Override
    protected List<String> checkArgParams(@NonNull ProjectParams params) {
        List<String> errors = new ArrayList<>();
        if (params == null) {
            return errors;
        }
        if (params.getBaseUrlParam() != null && !checkBaseUrl(params.getBaseUrlParam())) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.wrong_base_url"));
        }
        return errors;
    }

    @Override
    protected void populateWithArgParams(PropertiesWithTargets props, @NonNull ProjectParams params) {
        if (params.getIdParam() != null) {
            props.setProjectId(params.getIdParam());
        }
        if (params.getTokenParam() != null) {
            props.setApiToken(params.getTokenParam());
        }
        if (params.getBasePathParam() != null) {
            props.setBasePath(params.getBasePathParam());
        }
        if (params.getBaseUrlParam() != null) {
            props.setBaseUrl(params.getBaseUrlParam());
        }
    }

    @Override
    protected void populateWithDefaultValues(PropertiesWithTargets props) {
        if (props == null) {
            return;
        }
        String userDir = Paths.get(System.getProperty("user.dir")).toString();
        if (props.getBasePath() != null) {
            Path path;
            try {
                path = Paths.get(userDir).resolve(props.getBasePath().replaceFirst("^~", System.getProperty("user.home"))).toRealPath();
            } catch (NoSuchFileException e) {
                path = Paths.get(e.getMessage());
            } catch (IOException e) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.while_checking_base_path"), e);
            }
            props.setBasePath(StringUtils.removeEnd(path.toString(), Utils.PATH_SEPARATOR) + Utils.PATH_SEPARATOR);
        } else {
            props.setBasePath(StringUtils.removeEnd(userDir, Utils.PATH_SEPARATOR) + Utils.PATH_SEPARATOR);
        }

        if (StringUtils.isNotEmpty(props.getBaseUrl())) {
            props.setBaseUrl(StringUtils.removePattern(props.getBaseUrl(), "/(api(/|/v2/?)?)?$"));
        } else {
            props.setBaseUrl(Utils.getBaseUrl());
        }
        if (props.getTargets() == null) {
            return;
        }
        for (TargetBean tb : props.getTargets()) {
        }
    }

    @Override
    protected List<String> checkProperties(PropertiesWithTargets props) {
        List<String> errors = new ArrayList<>();
        if (props == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.property_bean_null"));
            return errors;
        }
        if (StringUtils.isEmpty(props.getProjectId())) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.missed_project_id"));
        } else if (!StringUtils.isNumeric(props.getProjectId())) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.project_id_is_not_number"));
        }
        if (StringUtils.isEmpty(props.getApiToken())) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.missed_api_token"));
        }
        if (StringUtils.isEmpty(props.getBaseUrl())) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.missed_base_url"));
        } else if (!checkBaseUrl(props.getBaseUrl())) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.wrong_base_url"));
        }

        if (StringUtils.isNotEmpty(props.getBasePath())) {
            if (!checkBasePathExists(props.getBasePath())) {
                errors.add(String.format(RESOURCE_BUNDLE.getString("error.config.base_path_not_exist"), props.getBasePath()));
            } else if (!checkBasePathIsDir(props.getBasePath())) {
                errors.add(String.format(RESOURCE_BUNDLE.getString("error.config.base_path_is_not_dir"), props.getBasePath()));
            }
        } else {
            errors.add(RESOURCE_BUNDLE.getString("error.config.base_path_empty"));
        }

        if (props.getTargets() == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.missed_section_targets"));
        } else if (props.getTargets().isEmpty()) {
            errors.add(RESOURCE_BUNDLE.getString("error.config.empty_section_target"));
        } else {
            for (TargetBean tb : props.getTargets())  {
            }
        }
        return errors;
    }
}
