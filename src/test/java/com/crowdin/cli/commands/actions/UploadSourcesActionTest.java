package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.models.BranchBuilder;
import com.crowdin.cli.client.models.DirectoryBuilder;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.PropertiesBeanBuilder;
import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcefiles.model.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;

import static org.mockito.Mockito.*;

public class UploadSourcesActionTest {

    static TempProject project;

    @BeforeEach
    public void createProj() {
        project = new TempProject(FileHelperTest.class);
    }

    @AfterEach
    public void deleteProj() {
        project.delete();
    }

    @Test
    public void testUploadOneSource_EmptyProject() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        PropertiesBeanBuilder pbBuilder = new PropertiesBeanBuilder()
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesBean pb = pbBuilder.build();
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);

        Action action = new UploadSourcesAction(null, false, true, false);
        action.act(pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("first.po");
            setStorageId(1L);
            setImportOptions(new OtherFileImportOptions() {{
                setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
            }});
            setExportOptions(new PropertyFileExportOptions() {{
                setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
            }});
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadFewSourceWithDirectories_EmptyProject() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        project.addFile(Utils.normalizePath("folder/second.po"), "Hello, World!");
        project.addFile(Utils.normalizePath("third.po"), "Hello, World!");
        PropertiesBeanBuilder pbBuilder = new PropertiesBeanBuilder()
            .minimalBuiltPropertiesBean(Utils.normalizePath("**/*"), Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesBean pb = pbBuilder.build();
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);
        AddDirectoryRequest addDirectoryRequest = new AddDirectoryRequest() {{
            setName("folder");
        }};
        Directory directory = DirectoryBuilder.standard().setProjectId(Long.parseLong(pb.getProjectId()))
            .setIdentifiers("folder", 201L, null, null).build();
        when(client.addDirectory(eq(addDirectoryRequest)))
            .thenReturn(directory);
        when(client.uploadStorage(eq("second.po"), any()))
            .thenReturn(2L);
        when(client.uploadStorage(eq("third.po"), any()))
            .thenReturn(3L);

        Action action = new UploadSourcesAction(null, false, true, false);
        action.act(pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po"), any());
        verify(client).addDirectory(eq(addDirectoryRequest));
        verify(client).uploadStorage(eq("second.po"), any());
        verify(client).uploadStorage(eq("third.po"), any());
        AddFileRequest addFileRequest1 = new AddFileRequest() {{
            setName("first.po");
            setStorageId(1L);
            setImportOptions(new OtherFileImportOptions() {{
                setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
            }});
            setExportOptions(new PropertyFileExportOptions() {{
                setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
            }});
        }};
        verify(client).addSource(eq(addFileRequest1));
        AddFileRequest addFileRequest2 = new AddFileRequest() {{
            setName("second.po");
            setStorageId(2L);
            setDirectoryId(201L);
            setImportOptions(new OtherFileImportOptions() {{
                setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
            }});
            setExportOptions(new PropertyFileExportOptions() {{
                setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
            }});
        }};
        verify(client).addSource(eq(addFileRequest2));
        AddFileRequest addFileRequest3 = new AddFileRequest() {{
            setName("third.po");
            setStorageId(3L);
            setImportOptions(new OtherFileImportOptions() {{
                setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
            }});
            setExportOptions(new PropertyFileExportOptions() {{
                setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
            }});
        }};
        verify(client).addSource(eq(addFileRequest3));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneSourceWithBranch_EmptyProject() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        PropertiesBeanBuilder pbBuilder = new PropertiesBeanBuilder()
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesBean pb = pbBuilder.build();
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);
        Branch branch = BranchBuilder.standard().setProjectId(Long.parseLong(pb.getProjectId()))
            .setIdentifiers("newBranch", 201L).build();
        AddBranchRequest addBranchRequest = new AddBranchRequest() {{
            setName("newBranch");
        }};
        when(client.addBranch(addBranchRequest))
            .thenReturn(branch);

        Action action = new UploadSourcesAction("newBranch", false, true, false);
        action.act(pb, client);

        verify(client).downloadFullProject();
        verify(client).addBranch(addBranchRequest);
        verify(client).uploadStorage(eq("first.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("first.po");
            setStorageId(1L);
            setBranchId(201L);
            setImportOptions(new OtherFileImportOptions() {{
                setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
            }});
            setExportOptions(new PropertyFileExportOptions() {{
                setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
            }});
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneSourceWithBranch_ProjectWithThatBranch() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        PropertiesBeanBuilder pbBuilder = new PropertiesBeanBuilder()
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesBean pb = pbBuilder.build();
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addBranches(201L, "newBranch").build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);

        Action action = new UploadSourcesAction("newBranch", false, true, false);
        action.act(pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("first.po");
            setStorageId(1L);
            setBranchId(201L);
            setImportOptions(new OtherFileImportOptions() {{
                setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
            }});
            setExportOptions(new PropertyFileExportOptions() {{
                setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
            }});
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneSourceWithDirectory_ProjectNotPreserveHierarchy() throws ResponseException {
        project.addFile(Utils.normalizePath("folder/first.po"), "Hello, World!");
        PropertiesBeanBuilder pbBuilder = new PropertiesBeanBuilder()
            .minimalBuiltPropertiesBean(Utils.normalizePath("**/*"), Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesBean pb = pbBuilder.build();
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);

        Action action = new UploadSourcesAction(null, false, true, false);
        action.act(pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("first.po");
            setStorageId(1L);
            setDirectoryId(null);
            setImportOptions(new OtherFileImportOptions() {{
                setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
            }});
            setExportOptions(new PropertyFileExportOptions() {{
                setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
            }});
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneSourceWithDirectory_ProjectWithPreserveHierarchy() throws ResponseException {
        project.addFile(Utils.normalizePath("folder/first.po"), "Hello, World!");
        PropertiesBeanBuilder pbBuilder = new PropertiesBeanBuilder()
            .minimalBuiltPropertiesBean(Utils.normalizePath("**/*"), Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesBean pb = pbBuilder.build();
        pb.setPreserveHierarchy(true);
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addDirectory("folder", 101L, null, null).build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);

        Action action = new UploadSourcesAction(null, false, true, false);
        action.act(pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("first.po");
            setStorageId(1L);
            setDirectoryId(101L);
            setImportOptions(new OtherFileImportOptions() {{
                setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
            }});
            setExportOptions(new PropertyFileExportOptions() {{
                setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
            }});
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneSourceWithDest_Project() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        PropertiesBeanBuilder pbBuilder = new PropertiesBeanBuilder()
            .minimalBuiltPropertiesBean(Utils.normalizePath("first.po"), Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesBean pb = pbBuilder.build();
        pb.getFiles().get(0).setDest("last.po");
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.uploadStorage(eq("last.po"), any()))
            .thenReturn(1L);

        Action action = new UploadSourcesAction(null, false, true, false);
        action.act(pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("last.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("last.po");
            setStorageId(1L);
            setDirectoryId(null);
            setImportOptions(new OtherFileImportOptions() {{
                setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
            }});
            setExportOptions(new PropertyFileExportOptions() {{
                setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
            }});
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUpdateOneUploadOneSource_Project() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        project.addFile(Utils.normalizePath("second.po"), "Hello, World!");
        PropertiesBeanBuilder pbBuilder = new PropertiesBeanBuilder()
            .minimalBuiltPropertiesBean(Utils.normalizePath("*"), Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesBean pb = pbBuilder.build();
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 101L, null, null).build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);
        when(client.uploadStorage(eq("second.po"), any()))
            .thenReturn(2L);

        Action action = new UploadSourcesAction(null, false, true, false);
        action.act(pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po"), any());
        verify(client).uploadStorage(eq("second.po"), any());
        UpdateFileRequest updateFileRequest = new UpdateFileRequest() {{
            setStorageId(1L);
            setImportOptions(new OtherFileImportOptions() {{
                setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
            }});
            setExportOptions(new PropertyFileExportOptions() {{
                setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
            }});
        }};
        verify(client).updateSource(eq(101L), eq(updateFileRequest));
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("second.po");
            setStorageId(2L);
            setDirectoryId(null);
            setImportOptions(new OtherFileImportOptions() {{
                setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
            }});
            setExportOptions(new PropertyFileExportOptions() {{
                setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
            }});
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testAddCsvFile_EmptyProject() throws ResponseException {

        project.addFile(Utils.normalizePath("first.csv"), "Hello, World!");
        PropertiesBeanBuilder pbBuilder = new PropertiesBeanBuilder()
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(project.getBasePath());
        PropertiesBean pb = pbBuilder.build();
        pb.getFiles().get(0).setScheme("identifier,source_phrase,context,uk,ru,fr");
        Client client = mock(Client.class);
        when(client.downloadFullProject())
                .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.uploadStorage(eq("first.csv"), any()))
                .thenReturn(1L);

        Action action = new UploadSourcesAction(null, false, true, false);
        action.act(pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.csv"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("first.csv");
            setStorageId(1L);
            setImportOptions(new SpreadsheetFileImportOptions() {{
                setScheme(new HashMap<String, Integer>() {{
                    put("identifier", 0);
                    put("source_phrase", 1);
                    put("context", 2);
                    put("uk", 3);
                    put("ru", 4);
                    put("fr", 5);
                }});
                setFirstLineContainsHeader(false);
            }});
            setExportOptions(new PropertyFileExportOptions() {{
                setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
            }});
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }
}
