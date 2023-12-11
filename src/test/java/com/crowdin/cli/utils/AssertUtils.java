package com.crowdin.cli.utils;

import java.io.File;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;


public class AssertUtils {

    public static void assertPathsEqualIgnoringSeparator(String actual, String expected) {
        actual = actual.replace("/", File.separator).replace("\\", File.separator);
        expected = expected.replace("/", File.separator).replace("\\", File.separator);
        assertThat(actual, equalTo(expected));
    }

}
