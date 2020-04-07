package com.crowdin.cli.utils.tree;

import com.crowdin.cli.BaseCli;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;

public class DrawTreeTest {

    private static final String ELEM = BaseCli.RESOURCE_BUNDLE.getString("message.tree.elem");
    private static final String LAST_ELEM = BaseCli.RESOURCE_BUNDLE.getString("message.tree.last_elem");
    private static final String DIR = BaseCli.RESOURCE_BUNDLE.getString("message.tree.dir");
    private static final String LAST_DIR = BaseCli.RESOURCE_BUNDLE.getString("message.tree.last_dir");

    @Test
    public void testDraw_Errors() {
        assertThrows(NullPointerException.class, () -> DrawTree.draw(null));
    }

    @ParameterizedTest
    @MethodSource
    public void testDraw(List<String> files, List<String> expected) {
        List<String> result = DrawTree.draw(files);
        assertEquals(expected, result, "expected:\n" + String.join("\n", expected) + "\n\nresult:\n" + String.join("\n", result));
    }

    public static Stream<Arguments> testDraw() {
        return Stream.of(
                arguments(new ArrayList<String>() {{
                }}, new ArrayList<String>() {{
                    add("╰─ .");
                }}),
                arguments(new ArrayList<String>() {{
                    add("folder/file.po");
                }}, new ArrayList<String>() {{
                    add(LAST_ELEM + ".");
                    add(LAST_DIR + LAST_ELEM + "folder");
                    add("      " + LAST_ELEM + "file.po");
                }}),
                arguments(new ArrayList<String>() {{
                    add("folder/file.po");
                    add("folder/next/meme.png");
                }}, new ArrayList<String>() {{
                    add(LAST_ELEM + ".");
                    add(LAST_DIR + LAST_ELEM + "folder");
                    add(LAST_DIR + LAST_DIR + ELEM + "file.po");
                    add(LAST_DIR + LAST_DIR + LAST_ELEM + "next");
                    add(LAST_DIR + LAST_DIR + LAST_DIR + LAST_ELEM + "meme.png");
                }}),
                arguments(new ArrayList<String>() {{
                    add("folder/file.po");
                    add("folder/next/meme.png");
                    add("dir/android.xml");
                }}, new ArrayList<String>() {{
                    add(LAST_ELEM + ".");
                    add(LAST_DIR + ELEM + "folder");
                    add(LAST_DIR + DIR + ELEM + "file.po");
                    add(LAST_DIR + DIR + LAST_ELEM + "next");
                    add(LAST_DIR + DIR + LAST_DIR + LAST_ELEM + "meme.png");
                    add(LAST_DIR + LAST_ELEM + "dir");
                    add(LAST_DIR + LAST_DIR + LAST_ELEM + "android.xml");
                }})
        );
    }
}
