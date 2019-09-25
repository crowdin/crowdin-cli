package com.crowdin.cli.utils;

import java.util.ResourceBundle;


public class MessageSource {

    public static final ResourceBundle RESOURCE_BUNDLE = ResourceBundle.getBundle("messages/messages");

    public enum Messages {

        CONFIGURATION_FILE_IS_INVALID("configuration_file_is_invalid"),
        ERROR_PROJECT_NOT_FOUND("error_project_not_found"),
        ERROR_DURING_FILE_WRITE("file_write_error"),
        MISSING_PROPERTY_BEAN("missing_property_bean"),


        FETCHING_PROJECT_INFO("fetching_project_info"),
        BUILDING_TRANSLATION("building_translation"),
        DOWNLOADING_TRANSLATION("downloading_translation"),

        GENERATE_HELP_MESSAGE("command_generate_help_message");


        Messages(String messageKey) {
            this.messageKey = messageKey;
        }

        private String messageKey;

        public String getString() {
            return RESOURCE_BUNDLE.getString(messageKey);
        }
    }

}
