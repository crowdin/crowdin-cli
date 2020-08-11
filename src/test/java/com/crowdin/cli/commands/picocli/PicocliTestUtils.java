package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Action;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.Step;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.PropertiesBeanBuilder;
import org.junit.jupiter.api.BeforeEach;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class PicocliTestUtils {

    protected Actions actionsMock;
    protected Action actionMock;
    protected ClientAction clientActionMock;
    protected Step<PropertiesBean> propertiesBeanStepMock;

    @BeforeEach
    public void beforeEach() {
        mockActions();
    }

    public void execute(String... args) {
        int exitCode = PicocliRunner.getInstance().execute(actionsMock, args);
        assertEquals(0, exitCode);
    }

    public void executeInvalidParams(String... args) {
        int exitCode = PicocliRunner.getInstance().execute(actionsMock, args);
        assertNotEquals(0, exitCode);
        verifyNoMoreInteractions(actionsMock);
    }

    public void executeHelp(String... args) {
        int exitCode = PicocliRunner.getInstance().execute(actionsMock, args);
        assertEquals(0, exitCode);
        verifyNoMoreInteractions(actionsMock);
    }

    public void check(boolean isClient) {
        if (isClient) {
            verify(actionsMock).buildProperties(any(), any(), any());
            verify(propertiesBeanStepMock).act(any());
            verify(clientActionMock).act(any(), any(), any());
        } else {
            verify(actionMock).act(any());
        }
        verifyNoMoreInteractions(actionsMock);
        verifyNoMoreInteractions(actionMock);
        verifyNoMoreInteractions(clientActionMock);
    }

    void mockActions() {
        actionsMock = mock(Actions.class);
        actionMock = mock(Action.class);
        clientActionMock = mock(ClientAction.class);
        propertiesBeanStepMock = (Step<PropertiesBean>) mock(Step.class);

        when(propertiesBeanStepMock.act(any()))
            .thenReturn(PropertiesBeanBuilder.minimalBuiltPropertiesBean().build());

        when(actionsMock.download(any(), anyBoolean(), any(), any(), anyBoolean(), anyBoolean(), any(), any(), any(), anyBoolean()))
            .thenReturn(clientActionMock);
        when(actionsMock.generate(any(), any(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.listBranches(anyBoolean(), anyBoolean()))
            .thenReturn(clientActionMock);
        when(actionsMock.listProject(anyBoolean(), any(), anyBoolean(), anyBoolean()))
            .thenReturn(clientActionMock);
        when(actionsMock.listSources(anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(clientActionMock);
        when(actionsMock.listTranslations(anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(clientActionMock);
        when(actionsMock.status(anyBoolean(), any(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(clientActionMock);
        when(actionsMock.stringAdd(anyBoolean(), any(), any(), any(), any(), any(), any()))
            .thenReturn(clientActionMock);
        when(actionsMock.stringDelete(anyBoolean(), any(), any(), any()))
            .thenReturn(clientActionMock);
        when(actionsMock.stringEdit(anyBoolean(), any(), any(), any(), any(), any(), any()))
            .thenReturn(clientActionMock);
        when(actionsMock.stringList(anyBoolean(), anyBoolean(), any(), any()))
            .thenReturn(clientActionMock);
        when(actionsMock.uploadSources(any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(clientActionMock);
        when(actionsMock.uploadTranslations(anyBoolean(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(clientActionMock);
        when(actionsMock.checkNewVersion())
            .thenReturn(actionMock);
        when(actionsMock.buildProperties(any(), any(), any()))
            .thenReturn(propertiesBeanStepMock);
    }
}
