package com.crowdin.cli.utils.console;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

public class ConsoleSpinnerTest {

    @Test
    public void test_notStarted() {
        assertDoesNotThrow(() -> ConsoleSpinner.update("message"));
        assertDoesNotThrow(() -> ConsoleSpinner.stop(ExecutionStatus.OK));
    }

    @Test
    public void test_started_1() {
        assertDoesNotThrow(() -> ConsoleSpinner.start("message", true));
        assertDoesNotThrow(() -> ConsoleSpinner.update("message"));
        assertDoesNotThrow(() -> ConsoleSpinner.stop(ExecutionStatus.OK));
    }

    @Test
    public void test_started_2() {
        assertDoesNotThrow(() -> ConsoleSpinner.start("message", false));
        assertDoesNotThrow(() -> ConsoleSpinner.update("message"));
        assertDoesNotThrow(() -> ConsoleSpinner.stop(ExecutionStatus.OK));
    }

    @Test
    public void test_started_3() {
        assertDoesNotThrow(() -> ConsoleSpinner.start("message", true));
        assertDoesNotThrow(() -> ConsoleSpinner.start("message2", true));
        assertDoesNotThrow(() -> ConsoleSpinner.stop(ExecutionStatus.OK));
    }
}
