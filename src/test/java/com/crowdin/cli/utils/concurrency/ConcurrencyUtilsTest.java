package com.crowdin.cli.utils.concurrency;

import org.apache.commons.lang3.tuple.Pair;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class ConcurrencyUtilsTest {

    @Test
    public void dumbTestSingleThread() {
        AtomicInteger counter = new AtomicInteger(0);
        List<Runnable> tasks = Stream.iterate(1, n -> n + 1).limit(10000)
            .map(x -> (Runnable) counter::incrementAndGet)
            .collect(Collectors.toList());
        ConcurrencyUtil.executeAndWaitSingleThread(tasks, false);
        assertEquals(10000, counter.get());
    }

    @Test
    public void dumbTest() {
        AtomicInteger counter = new AtomicInteger(0);
        List<Runnable> tasks = Stream.iterate(1, n -> n + 1).limit(10000)
            .map(x -> (Runnable) counter::incrementAndGet)
            .collect(Collectors.toList());
        ConcurrencyUtil.executeAndWait(tasks, false);
        assertEquals(10000, counter.get());
    }
}
