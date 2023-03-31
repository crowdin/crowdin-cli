package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.client.models.BranchBuilder;
import com.crowdin.cli.client.models.DirectoryBuilder;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcefiles.model.AddBranchRequest;
import com.crowdin.client.sourcefiles.model.AddDirectoryRequest;
import com.crowdin.client.sourcefiles.model.AddFileRequest;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.OtherFileImportOptions;
import com.crowdin.client.sourcefiles.model.PropertyFileExportOptions;
import com.crowdin.client.sourcefiles.model.SpreadsheetFileImportOptions;
import com.crowdin.client.sourcefiles.model.UpdateFileRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import static org.mockito.Mockito.any;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class UploadSourcesActionTest {

    private TempProject project;

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
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadSourcesAction(null, false, false, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).listLabels();
        verify(client).uploadStorage(eq("first.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
                setName("first.po");
                setStorageId(1L);
                setImportOptions(new OtherFileImportOptions() {{
                        setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                    }}
                );
                setExportOptions(new PropertyFileExportOptions() {{
                        setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                        setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                    }}
                );
            }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneSourceWithNullContentSegmentation_EmptyProject() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        pb.getFiles().get(0).setContentSegmentation(null);

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
                .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.uploadStorage(eq("first.po"), any()))
                .thenReturn(1L);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadSourcesAction(null, false, false, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).listLabels();
        verify(client).uploadStorage(eq("first.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("first.po");
            setStorageId(1L);
            setImportOptions(new OtherFileImportOptions() {{
                                 setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                             }}
            );
            setExportOptions(new PropertyFileExportOptions() {{
                                 setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                                 setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                             }}
            );
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadFewSourceWithDirectories_EmptyProject() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        project.addFile(Utils.normalizePath("folder/second.po"), "Hello, World!");
        project.addFile(Utils.normalizePath("third.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean(Utils.normalizePath("**/*"), Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
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

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadSourcesAction(null, false, false, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).listLabels();
        verify(client).uploadStorage(eq("first.po"), any());
        verify(client).addDirectory(eq(addDirectoryRequest));
        verify(client).uploadStorage(eq("second.po"), any());
        verify(client).uploadStorage(eq("third.po"), any());
        AddFileRequest addFileRequest1 = new AddFileRequest() {{
                setName("first.po");
                setStorageId(1L);
                setImportOptions(new OtherFileImportOptions() {{
                        setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                    }}
                );
                setExportOptions(new PropertyFileExportOptions() {{
                        setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                        setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                    }}
                );
            }};
        verify(client).addSource(eq(addFileRequest1));
        AddFileRequest addFileRequest2 = new AddFileRequest() {{
                setName("second.po");
                setStorageId(2L);
                setDirectoryId(201L);
                setImportOptions(new OtherFileImportOptions() {{
                        setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                    }}
                );
                setExportOptions(new PropertyFileExportOptions() {{
                        setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                        setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                    }}
                );
            }};
        verify(client).addSource(eq(addFileRequest2));
        AddFileRequest addFileRequest3 = new AddFileRequest() {{
                setName("third.po");
                setStorageId(3L);
                setImportOptions(new OtherFileImportOptions() {{
                        setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                    }}
                );
                setExportOptions(new PropertyFileExportOptions() {{
                        setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                        setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                    }}
                );
            }};
        verify(client).addSource(eq(addFileRequest3));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneSourceWithBranch_EmptyProject() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
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

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadSourcesAction("newBranch", false, false, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).addBranch(addBranchRequest);
        verify(client).listLabels();
        verify(client).uploadStorage(eq("first.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
                setName("first.po");
                setStorageId(1L);
                setBranchId(201L);
                setImportOptions(new OtherFileImportOptions() {{
                        setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                    }}
                );
                setExportOptions(new PropertyFileExportOptions() {{
                        setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                        setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                    }}
                );
            }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneSourceWithBranch_ProjectWithThatBranch() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addBranches(201L, "newBranch").build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadSourcesAction("newBranch", false, false, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).listLabels();
        verify(client).uploadStorage(eq("first.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
                setName("first.po");
                setStorageId(1L);
                setBranchId(201L);
                setImportOptions(new OtherFileImportOptions() {{
                        setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                    }}
                );
                setExportOptions(new PropertyFileExportOptions() {{
                        setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                        setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                    }}
                );
            }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneSourceWithDirectory_ProjectNotPreserveHierarchy() throws ResponseException {
        project.addFile(Utils.normalizePath("folder/first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean(Utils.normalizePath("**/*"), Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadSourcesAction(null, false, false, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).listLabels();
        verify(client).uploadStorage(eq("first.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
                setName("first.po");
                setStorageId(1L);
                setDirectoryId(null);
                setImportOptions(new OtherFileImportOptions() {{
                        setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                    }}
                );
                setExportOptions(new PropertyFileExportOptions() {{
                        setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                        setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                    }}
                );
            }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneSourceWithDirectory_ProjectWithPreserveHierarchy() throws ResponseException {
        project.addFile(Utils.normalizePath("folder/first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean(Utils.normalizePath("**/*"), Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        pb.setPreserveHierarchy(true);
        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addDirectory("folder", 101L, null, null).build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadSourcesAction(null, false, false, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).listLabels();
        verify(client).uploadStorage(eq("first.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
                setName("first.po");
                setStorageId(1L);
                setDirectoryId(101L);
                setImportOptions(new OtherFileImportOptions() {{
                        setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                    }}
                );
                setExportOptions(new PropertyFileExportOptions() {{
                        setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                        setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                    }}
                );
            }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneSourceWithDest_Project() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean(Utils.normalizePath("first.po"), Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        pb.getFiles().get(0).setDest("last.po");
        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadSourcesAction(null, false, false, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).listLabels();
        verify(client).uploadStorage(eq("first.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
                setName("last.po");
                setStorageId(1L);
                setDirectoryId(null);
                setImportOptions(new OtherFileImportOptions() {{
                        setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                    }}
                );
                setExportOptions(new PropertyFileExportOptions() {{
                        setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                        setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                    }}
                );
            }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneSourceWithDestAndDeleteObsoleteOption_Project() throws ResponseException {
        project.addFile(Utils.normalizePath("docs/en/index.md"), "Hello, World!");
        String translationPattern = "/app/docs/%two_letters_code%/%original_file_name%";
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean(Utils.normalizePath("/docs/en/index.md"), translationPattern, Arrays.asList("**/.*"))
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        pb.getFiles().get(0).setDest("/app/%original_path%/%original_file_name%");
        pb.setPreserveHierarchy(true);
        pb.setProjectId("551261");
        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
                .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                        .addFile("locale.yml", "yaml", 66l, 209l, null, translationPattern)
                        .addFile("index.md", "yaml", 77l, 209l, null, translationPattern)
                        .addDirectory("docs", 207l, 215l, null)
                        .addDirectory("app", 215l, null, null)
                        .addDirectory("en", 209l, 207l, null)
                        .addDirectory("en", 225l, null, null)
                        .build());
        when(client.uploadStorage(eq("/docs/en/index.md"), any()))
                .thenReturn(1L);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadSourcesAction(null, true, false, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).listLabels();
        verify(client).uploadStorage(eq("index.md"), any());
        UpdateFileRequest updateFileRequest = new UpdateFileRequest() {{
            setStorageId(0L);
            setImportOptions(new OtherFileImportOptions() {{
                                 setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                             }}
            );
            setExportOptions(new PropertyFileExportOptions() {{
                                 setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                                 setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                             }}
            );
        }};
        verify(client).updateSource(eq(77l), eq(updateFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUpdateOneUploadOneSource_Project() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        project.addFile(Utils.normalizePath("second.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean(Utils.normalizePath("*"), Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 101L, null, null).build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);
        when(client.uploadStorage(eq("second.po"), any()))
            .thenReturn(2L);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadSourcesAction(null, false, false, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).listLabels();
        verify(client).uploadStorage(eq("first.po"), any());
        verify(client).uploadStorage(eq("second.po"), any());
        UpdateFileRequest updateFileRequest = new UpdateFileRequest() {{
                setStorageId(1L);
                setImportOptions(new OtherFileImportOptions() {{
                        setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                    }}
                );
                setExportOptions(new PropertyFileExportOptions() {{
                        setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                        setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                    }}
                );
            }};
        verify(client).updateSource(eq(101L), eq(updateFileRequest));
        AddFileRequest addFileRequest = new AddFileRequest() {{
                setName("second.po");
                setStorageId(2L);
                setImportOptions(new OtherFileImportOptions() {{
                        setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                    }}
                );
                setExportOptions(new PropertyFileExportOptions() {{
                        setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                        setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                    }}
                );
            }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testAddCsvFile_EmptyProject() throws ResponseException {

        project.addFile(Utils.normalizePath("first.csv"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        pb.getFiles().get(0).setScheme("identifier,source_phrase,context,uk,ru,fr");
        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
                .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.uploadStorage(eq("first.csv"), any()))
                .thenReturn(1L);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadSourcesAction(null, false, false, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).listLabels();
        verify(client).uploadStorage(eq("first.csv"), any());
        Map<String, Integer> scheme = new HashMap<>();
        scheme.put("identifier", 0);
        scheme.put("source_phrase", 1);
        scheme.put("context", 2);
        scheme.put("uk", 3);
        scheme.put("ru", 4);
        scheme.put("fr", 5);
        AddFileRequest addFileRequest = new AddFileRequest() {{
                setName("first.csv");
                setStorageId(1L);
                setImportOptions(new SpreadsheetFileImportOptions() {{
                        setScheme(scheme);
                        setFirstLineContainsHeader(false);
                    }}
                );
                setExportOptions(new PropertyFileExportOptions() {{
                        setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                        setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                    }}
                );
            }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneSourceWithDest_DifferentPlaceholders_1_Project() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean(Utils.normalizePath("first.po"), Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        pb.getFiles().get(0).setDest("%file_name%_file.%file_extension%");
        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadSourcesAction(null, false, false, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).listLabels();
        verify(client).uploadStorage(eq("first.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("first_file.po");
            setStorageId(1L);
            setDirectoryId(null);
            setImportOptions(new OtherFileImportOptions() {{
                                 setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                             }}
            );
            setExportOptions(new PropertyFileExportOptions() {{
                                 setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                                 setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                             }}
            );
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneSourceWithDest_DifferentPlaceholders_2_Project() throws ResponseException {
        project.addFile(Utils.normalizePath("here/first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean(Utils.normalizePath("here/first.po"), Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        pb.getFiles().get(0).setDest("**/%original_file_name%");
        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);
        AddDirectoryRequest addDirectoryRequest1 = new AddDirectoryRequest() {{
            setName("here");
        }};
        when(client.addDirectory(eq(addDirectoryRequest1)))
            .thenReturn(new Directory() {{
                setId(3L);
            }});

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadSourcesAction(null, false, false, true, true, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).listLabels();
        verify(client).uploadStorage(eq("first.po"), any());
        verify(client).addDirectory(eq(addDirectoryRequest1));
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("first.po");
            setStorageId(1L);
            setDirectoryId(3L);
            setImportOptions(new OtherFileImportOptions() {{
                                 setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                             }}
            );
            setExportOptions(new PropertyFileExportOptions() {{
                                 setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                                 setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                             }}
            );
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneSourceWithDest_DifferentPlaceholders_3_Project() throws ResponseException {
        project.addFile(Utils.normalizePath("here/first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean(Utils.normalizePath("here/first.po"), Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        pb.getFiles().get(0).setDest("%original_path%/inner/%original_file_name%");
        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);
        AddDirectoryRequest addDirectoryRequest1 = new AddDirectoryRequest() {{
            setName("here");
        }};
        AddDirectoryRequest addDirectoryRequest2 = new AddDirectoryRequest() {{
            setName("inner");
            setDirectoryId(3L);
        }};
        when(client.addDirectory(eq(addDirectoryRequest1)))
            .thenReturn(new Directory() {{
                setId(3L);
            }});
        when(client.addDirectory(eq(addDirectoryRequest2)))
            .thenReturn(new Directory() {{
                setId(4L);
            }});

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadSourcesAction(null, false, false, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).listLabels();
        verify(client).uploadStorage(eq("first.po"), any());
        verify(client).addDirectory(eq(addDirectoryRequest1));
        verify(client).addDirectory(eq(addDirectoryRequest2));
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("first.po");
            setStorageId(1L);
            setDirectoryId(4L);
            setImportOptions(new OtherFileImportOptions() {{
                                 setContentSegmentation(pb.getFiles().get(0).getContentSegmentation());
                             }}
            );
            setExportOptions(new PropertyFileExportOptions() {{
                                 setEscapeQuotes(pb.getFiles().get(0).getEscapeQuotes());
                                 setExportPattern(pb.getFiles().get(0).getTranslation().replaceAll("[\\\\/]+", "/"));
                             }}
            );
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }
}
