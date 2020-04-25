package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.exceptions.ExistsResponseException;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.exceptions.WaitResponseException;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.sourcefiles.model.AddDirectoryRequest;
import com.crowdin.client.sourcefiles.model.Directory;
import org.apache.commons.lang3.StringUtils;

import java.util.Map;
import java.util.ResourceBundle;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

public class ProjectUtils {

    private static final ResourceBundle RESOURCE_BUNDLE = BaseCli.RESOURCE_BUNDLE;

    /**
     * return deepest directory id
     */
    public static Long createPath(
            Client client,
            Map<String, Long> directoryIdMap,
            String filePath,
            com.crowdin.client.sourcefiles.model.Branch branchId
    ) {
        String[] nodes = filePath.split(Utils.PATH_SEPARATOR_REGEX);

        Long directoryId = null;
        String branchPath = (branchId != null) ? branchId.getName() + Utils.PATH_SEPARATOR : "";
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
                } else if (branchId != null) {
                    request.setBranchId(branchId.getId());
                }
                directoryId = createDirectory(directoryIdMap, client, request, parentPath.toString());
            }
        }
        return directoryId;
    }

    private static final Map<String, Lock> pathLocks = new ConcurrentHashMap<>();

    private static Long createDirectory(Map<String, Long> directoryIdMap, Client client, AddDirectoryRequest request, String key) {
        Lock lock;
        synchronized (pathLocks) {
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
            System.out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.directory"), StringUtils.removePattern(key, "[\\\\/]$"))));
        } catch (ExistsResponseException e) {
            System.out.println(ExecutionStatus.SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("message.directory"), StringUtils.removePattern(key, "[\\\\/]$"))));
            if (directoryIdMap.containsKey(key)) {
                return directoryIdMap.get(key);
            } else {
                throw new RuntimeException("Couldn't create directory '" + key + "' because it's already here");
            }
        } catch (WaitResponseException e) {
            try {
                Thread.sleep(500);
            } catch (InterruptedException ignored) {
            }
            return createDirectory(directoryIdMap, client, request, key);
        } catch (ResponseException e) {
            throw new RuntimeException("Unhandled exception", e);
        } finally {
            lock.unlock();
        }
        return directoryId;
    }
}
