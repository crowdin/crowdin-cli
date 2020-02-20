package com.crowdin.cli.utils;

import java.util.ResourceBundle;


public class MessageSource {

    public static final ResourceBundle RESOURCE_BUNDLE = ResourceBundle.getBundle("messages/messages");

    public enum Messages {

        ERROR_DURING_FILE_WRITE("file_write_error"),


        FETCHING_PROJECT_INFO("message.spinner.fetching_project_info"),
        BUILDING_TRANSLATION("message.spinner.building_translation"),
        DOWNLOADING_TRANSLATION("message.spinner.downloading_translation");


        Messages(String messageKey) {
            this.messageKey = messageKey;
        }

        private String messageKey;

        public String getString() {
            return RESOURCE_BUNDLE.getString(messageKey);
        }
    }

}
