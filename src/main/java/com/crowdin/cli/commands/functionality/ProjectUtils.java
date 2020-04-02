package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.BranchClient;
import com.crowdin.cli.client.DirectoriesClient;
import com.crowdin.cli.client.exceptions.ExistsResponseException;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.exceptions.WaitResponseException;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.common.models.Branch;
import com.crowdin.common.models.Directory;
import com.crowdin.common.request.BranchPayload;
import com.crowdin.common.request.DirectoryPayload;
import org.apache.commons.lang3.StringUtils;

import java.util.Map;
import java.util.Optional;
import java.util.ResourceBundle;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

public class ProjectUtils {

    private static final ResourceBundle RESOURCE_BUNDLE = BaseCli.RESOURCE_BUNDLE;

    public static Branch getOrCreateBranch(BranchClient branchClient, ProjectProxy project, String branchName) {
        Optional<Branch> branchOpt = project.getBranchByName(branchName);
        if (branchOpt.isPresent()) {
            return branchOpt.get();
        } else {
            try {
                Branch newBranch = branchClient.createBranch(new BranchPayload(branchName));
                project.addBranchToList(newBranch);
                System.out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch"), branchName)));
                return newBranch;
            } catch (ResponseException e) {
                throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.create_branch"), branchName), e);
            }
        }
    }

    /**
     * return deepest directory id
     */
    public static Long createPath(
            DirectoriesClient directoriesClient,
            Map<String, Long> directoryIdMap,
            String filePath,
            Optional<Branch> branchId
    ) {
        String[] nodes = filePath.split(Utils.PATH_SEPARATOR_REGEX);

        Long directoryId = null;
        String branchPath = (branchId.map(branch -> branch.getName() + Utils.PATH_SEPARATOR).orElse(""));
        StringBuilder parentPath = new StringBuilder(branchPath);
        for (String node : nodes) {
            if (StringUtils.isEmpty(node) || node.equals(nodes[nodes.length - 1])) {
                continue;
            }
            parentPath.append(node).append(Utils.PATH_SEPARATOR);
            if (directoryIdMap.containsKey(parentPath.toString())) {
                directoryId = directoryIdMap.get(parentPath.toString());
            } else {
                DirectoryPayload directoryPayload = new DirectoryPayload();
                directoryPayload.setName(node);

                if (directoryId == null) {
                    branchId.map(Branch::getId).ifPresent(directoryPayload::setBranchId);
                } else {
                    directoryPayload.setDirectoryId(directoryId);
                }
                directoryId = createDirectory(directoryIdMap, directoriesClient, directoryPayload, parentPath.toString());
            }
        }
        return directoryId;
    }

    private static final Map<String, Lock> pathLocks = new ConcurrentHashMap<>();

    private static Long createDirectory(Map<String, Long> directoryIdMap, DirectoriesClient directoriesClient, DirectoryPayload directoryPayload, String key) {
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
            Directory directory = directoriesClient.createDirectory(directoryPayload);
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
            return createDirectory(directoryIdMap, directoriesClient, directoryPayload, key);
        } catch (ResponseException e) {
            throw new RuntimeException("Unhandled exception", e);
        } finally {
            lock.unlock();
        }
        return directoryId;
    }
}
