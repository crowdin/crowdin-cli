package com.crowdin.cli.utils;

import java.util.ResourceBundle;


public class MessageSource {

    public static final ResourceBundle RESOURCE_BUNDLE = ResourceBundle.getBundle("messages/messages");

    public static final String MISSING_PROPERTY_BEAN = "missing_property_bean";

    public static final String MISSING_LOGIN = "error_missed_login";

    public static final String ERROR_DURING_FILE_WRITE = "file_write_error";

}
