package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.ExistsResponseException;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.client.WaitResponseException;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.sourcefiles.model.AddDirectoryRequest;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import org.apache.commons.lang3.StringUtils;

import java.util.Map;
import java.util.ResourceBundle;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

public class ProjectUtils {

    private static final ResourceBundle RESOURCE_BUNDLE = BaseCli.RESOURCE_BUNDLE;

    public static Long createPath(
            Outputter out,
            ProjectClient client,
            Map<String, Long> directoryIdMap,
            String filePath,
            Branch branch,
            boolean plainView
    ) {
        String[] nodes = filePath.split(Utils.PATH_SEPARATOR_REGEX);

        Long directoryId = null;
        String branchPath = (branch != null) ? Utils.sepAtEnd(branch.getName()) : "";
        StringBuilder parentPath = new StringBuilder(branchPath);
        for (String node : nodes) {
            if (StringUtils.isEmpty(node) || node.equals(nodes[nodes.length - 1])) {
                continue;
            }
            parentPath.append(node).append(Utils.PATH_SEPARATOR);
            if (directoryIdMap.containsKey(parentPath.toString())) {
                directoryId = directoryIdMap.get(parentPath.toString());
            } else {
                AddDirectoryRequest request = new AddDirectoryRequest();
                request.setName(node);
                if (directoryId != null) {
                    request.setDirectoryId(directoryId);
                } else if (branch != null) {
                    request.setBranchId(branch.getId());
                }
                directoryId = createDirectory(out, directoryIdMap, client, request, parentPath.toString(), plainView);
            }
        }
        return directoryId;
    }

    private static final Object obj = new Object();
    private static final Map<String, Lock> pathLocks = new ConcurrentHashMap<>();

    private static Long createDirectory(
        Outputter out, Map<String, Long> directoryIdMap, ProjectClient client, AddDirectoryRequest request, String key, boolean plainView
    ) {
        Lock lock;
        synchronized (obj) {
            if (!pathLocks.containsKey(key)) {
                pathLocks.put(key, new ReentrantLock());
            }
            lock = pathLocks.get(key);
        }
        Long directoryId;
        try {
            lock.lock();
            if (directoryIdMap.containsKey(key)) {
                return directoryIdMap.get(key);
            }
            Directory directory = client.addDirectory(request);
            directoryId = directory.getId();
            directoryIdMap.put(key, directoryId);
            if (!plainView) {
                out.println(ExecutionStatus.OK.withIcon(String.format(
                    RESOURCE_BUNDLE.getString("message.directory"), StringUtils.removePattern(key, "[\\\\/]$"))));
            } else {
                out.println(key);
            }
        } catch (ExistsResponseException e) {
            if (!plainView) {
                out.println(ExecutionStatus.SKIPPED.withIcon(String.format(
                    RESOURCE_BUNDLE.getString("message.directory"), StringUtils.removePattern(key, "[\\\\/]$"))));
            }
            if (directoryIdMap.containsKey(key)) {
                return directoryIdMap.get(key);
            } else {
                throw new RuntimeException("Couldn't create directory '" + key + "' because it's already here");
            }
        } catch (WaitResponseException e) {
            sleep(500);
            return createDirectory(out, directoryIdMap, client, request, key, plainView);
        } catch (ResponseException e) {
            throw new RuntimeException("Unhandled exception", e);
        } finally {
            lock.unlock();
        }
        return directoryId;
    }

    private static void sleep(int millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ie) {
//                ignore
        }
    }
}
