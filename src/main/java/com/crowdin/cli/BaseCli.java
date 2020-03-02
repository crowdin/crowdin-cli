package com.crowdin.cli;

import com.crowdin.cli.utils.MessageSource;
import com.crowdin.cli.utils.Utils;

import javax.ws.rs.core.HttpHeaders;
import java.util.ResourceBundle;

/**
 * Created by ihor on 12/1/16.
 */
public class BaseCli {

    public static final String[] defaultConfigs = {"crowdin.yml", "crowdin.yaml"};

    protected static final ResourceBundle RESOURCE_BUNDLE = MessageSource.RESOURCE_BUNDLE;
}
