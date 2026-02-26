package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NewProjectPropertiesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.AiContextUtil;
import com.crowdin.client.core.model.PatchRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.File;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

public class ContextUploadActionTest {

    @Test
    public void testBatchesAndCallsClient() throws Exception {
        ProjectProperties pb = NewProjectPropertiesUtilBuilder.minimalBuilt().build();
        ProjectClient client = mock(ProjectClient.class);

        File file = new File("dummy.jsonl");

        var r1 = new AiContextUtil.StringContextRecord(11L, "k1", "t1", "f", "man1", "ai1");
        var r2 = new AiContextUtil.StringContextRecord(22L, "k2", "t2", "f", "man2", "ai2");
        var r3 = new AiContextUtil.StringContextRecord(33L, "k3", "t3", "f", "", "ai3");

        try (var mocked = mockStatic(AiContextUtil.class)) {
            mocked.when(() -> AiContextUtil.readRecords(file)).thenReturn(List.of(r1, r2, r3));
            mocked.when(() -> AiContextUtil.fullContext("man1", "ai1")).thenReturn("man1\n\n✨ AI Context\nai1\n✨ 🔚");
            mocked.when(() -> AiContextUtil.fullContext("man2", "ai2")).thenReturn("man2");
            mocked.when(() -> AiContextUtil.fullContext("", "ai3")).thenReturn("\n\n✨ AI Context\nai3\n✨ 🔚");

            ContextUploadAction action = new ContextUploadAction(file, false, false, false, 2);
            action.act(Outputter.getDefault(), pb, client);
        }

        // Should call client.batchEditSourceStrings twice: sizes 2 and 1
        ArgumentCaptor<List> captor = ArgumentCaptor.forClass(List.class);
        verify(client, times(2)).batchEditSourceStrings(captor.capture());

        List<List> all = captor.getAllValues();
        assertEquals(2, all.size());
        assertEquals(2, all.get(0).size());
        assertEquals(1, all.get(1).size());

        // Check first batch contents (ids 11 and 22)
        PatchRequest p1 = (PatchRequest) all.get(0).get(0);
        PatchRequest p2 = (PatchRequest) all.get(0).get(1);
        PatchRequest p3 = (PatchRequest) all.get(1).get(0);

        assertEquals("/11/context", p1.getPath());
        assertTrue(p1.getValue().toString().contains("man1"));
        assertTrue(p1.getValue().toString().contains("ai1"));

        assertEquals("/22/context", p2.getPath());
        assertTrue(p2.getValue().toString().contains("man2"));

        assertEquals("/33/context", p3.getPath());
        assertTrue(p3.getValue().toString().contains("ai3"));
    }

    @Test
    public void testOverwriteFiltersRecords() throws Exception {
        ProjectProperties pb = NewProjectPropertiesUtilBuilder.minimalBuilt().build();
        ProjectClient client = mock(ProjectClient.class);

        File file = new File("dummy_overwrite.jsonl");

        var keep = new AiContextUtil.StringContextRecord(10L, "k10", "t10", "f", "man10", "");
        var skip = new AiContextUtil.StringContextRecord(11L, "k11", "t11", "f", "man11", "ai11");

        try (var mocked = mockStatic(AiContextUtil.class)) {
            mocked.when(() -> AiContextUtil.readRecords(file)).thenReturn(List.of(keep, skip));
            mocked.when(() -> AiContextUtil.fullContext("man10", "")).thenReturn("man10");
            mocked.when(() -> AiContextUtil.fullContext("man11", "ai11")).thenReturn("man11\n\n✨ AI Context\nai11\n✨ 🔚");

            // overwrite = true should KEEP only records with empty ai_context (i.e., 'keep')
            ContextUploadAction action = new ContextUploadAction(file, true, false, false, 10);
            action.act(Outputter.getDefault(), pb, client);
        }

        ArgumentCaptor<List> captor = ArgumentCaptor.forClass(List.class);
        verify(client, times(1)).batchEditSourceStrings(captor.capture());
        List batch = captor.getValue();
        assertEquals(2, batch.size());
        PatchRequest req = (PatchRequest) batch.get(0);
        assertEquals("/10/context", req.getPath());
        PatchRequest req2 = (PatchRequest) batch.get(1);
        assertEquals("/11/context", req2.getPath());
    }

    @Test
    public void testDryRunDoesNotCallClient() throws Exception {
        ProjectProperties pb = NewProjectPropertiesUtilBuilder.minimalBuilt().build();
        ProjectClient client = mock(ProjectClient.class);

        File file = new File("dummy_dry.jsonl");

        var rec = new AiContextUtil.StringContextRecord(21L, "k21", "t21", "f", "man21", "ai21");

        try (var mocked = mockStatic(AiContextUtil.class)) {
            mocked.when(() -> AiContextUtil.readRecords(file)).thenReturn(List.of(rec));
            mocked.when(() -> AiContextUtil.fullContext("man21", "ai21")).thenReturn("man21\n\n✨ AI Context\nai21\n✨ 🔚");

            ContextUploadAction action = new ContextUploadAction(file, false, true, false, 10);
            action.act(Outputter.getDefault(), pb, client);
        }

        verify(client, never()).batchEditSourceStrings(any());
    }
}
