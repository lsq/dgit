import type {
  DgitGlobalOption,
  DgitLifeCycle,
  DgitLoadGitTree,
  RepoOptionType,
  RepoTreeNode,
} from './type';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import async from 'async';
import {
  isHttpsLink,
  MakeDirs,
  ParseGithubHttpsLink,
} from './cmd/utils';
import { createLogger } from './log';
import repo from './repo';
import { requestGetPromise, requestOnStream } from './request';

const UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
const DEFAULT_PARALLEL_LIMIT = 10;
const MAX_PARALLEL_LIMIT = 100;
const JSON_STRINGIFY_PADDING = 2;

// https://deepwiki.com/search/python-node-treepythonjula-pyt_e06e7d62-6a9a-4d4b-9e74-0a1cf32f4946?mode=fast
async function dgit(repoOption: RepoOptionType, dPath: string, dgitOptions?: DgitGlobalOption, hooks?: DgitLifeCycle & DgitLoadGitTree): Promise<void> {
  const {
    username,
    password,
    token,
    githubLink,
    proxy = '',
  } = repoOption;

  let {
    owner,
    repoName,
    ref = 'master',
    relativePath = '.',
  } = repoOption;

  if (githubLink && isHttpsLink(githubLink)) {
    const parseResult = ParseGithubHttpsLink(githubLink);
    owner = parseResult.owner;
    repoName = parseResult.repoName;
    ref = parseResult.ref;
    relativePath = parseResult.relativePath;
  }

  if (!owner || !repoName) {
    throw new Error('invalid repo option.');
  }

  const logger = createLogger(dgitOptions);

  const { exclude = [], include = [], exactMatch = false } = dgitOptions || {};

  let { parallelLimit = DEFAULT_PARALLEL_LIMIT } = dgitOptions || {};
  if (!parallelLimit || parallelLimit <= 0) {
    logger('parallelLimit value is invalid.');
    parallelLimit = DEFAULT_PARALLEL_LIMIT;
  }

  parallelLimit > MAX_PARALLEL_LIMIT && (parallelLimit = MAX_PARALLEL_LIMIT);

  const {
    onSuccess,
    onError,
    onProgress,
    onFinish,
    onRetry,
    onResolved,
    beforeLoadTree,
    afterLoadTree,
  } = hooks || {};

  let onSuccessResolve: (data?: any) => void = () => {};
  let onErrorReject: (err?: any) => void = () => {};

  const prom: Promise<void> = new Promise((resolve, reject) => {
    onSuccessResolve = resolve;
    onErrorReject = reject;
  });

  const { getRepoTreeUrl, getDownloadUrl } = repo(owner, repoName, ref, proxy);
  const url = getRepoTreeUrl();

  const config = {
    url,
    headers: {
      'User-Agent': UserAgent,
      'Authorization': token ? `token ${token}` : undefined,
    },
    auth: username && password
      ? {
          username,
          password,
        }
      : undefined,
  };

  const destPath = path.isAbsolute(dPath) ? dPath : path.resolve(process.cwd(), dPath);

  logger(' request repo tree options.');
  logger(JSON.stringify(config, null, JSON_STRINGIFY_PADDING));

  try {
    logger(' loading remote repo tree...');
    beforeLoadTree && beforeLoadTree();
    const body = await requestGetPromise(config, dgitOptions || {}, {
      onRetry() {
        logger(` request ${url} failed. Retrying...`);
        onRetry && onRetry();
      },
    });

    logger(' loading remote repo tree succeed.');
    afterLoadTree && afterLoadTree();
    const result = body;

    if (!result.tree || result.tree.length <= 0) {
      throw new Error('404 repo not found!');
    }

    const treeNodeList: RepoTreeNode[] = result.tree;
    const includeTreeNodeList = treeNodeList.filter((node) => {
      const nPath = path.resolve(__dirname, node.path);
      const rPath = path.resolve(__dirname, relativePath);
      let pathMatch: boolean;
      if (exactMatch) {
        // 精确匹配：路径完全相等或者路径后跟分隔符
        pathMatch = nPath === rPath || nPath.startsWith(rPath + path.sep) || nPath.startsWith(`${rPath}/`);
      }
      else {
        pathMatch = nPath.startsWith(rPath);
      }
      if (!pathMatch || node.type !== 'blob') {
        return false;
      }
      if (
        exclude.some(v => nPath.startsWith(path.resolve(rPath, v)))
        && include.every(v => !nPath.startsWith(path.resolve(rPath, v)))
      ) {
        return false;
      }
      return true;
    });

    if (includeTreeNodeList.length <= 0) {
      throw new Error(`404 repo ${relativePath} not found!`);
    }

    const totalStatus = includeTreeNodeList.reduce(
      (prev, cur) => {
        if (cur.type === 'blob') {
          prev.size += cur.size;
          prev.count++;
        }
        return prev;
      },
      { size: 0, count: 0 },
    );

    let currentSize = 0;
    let currentCount = 0;

    onResolved
    && onResolved({
      currentSize,
      currentCount,
      totalSize: totalStatus.size,
      totalCount: totalStatus.count,
    });

    logger(' include files resolved.');
    logger(
      '',
      JSON.stringify({
        currentSize,
        currentCount,
        totalSize: totalStatus.size,
        totalCount: totalStatus.count,
      }),
    );

    async.eachLimit(
      includeTreeNodeList,
      parallelLimit,
      (node, callback) => {
        const downloadUrl = getDownloadUrl(node.path);

        const rPath = path.resolve(destPath, relativePath);
        const tPath = path.resolve(destPath, node.path);
        const root = path.resolve(destPath, '.');

        let targetPath: string;
        if (rPath === tPath) {
          targetPath = path.resolve(destPath, path.basename(tPath));
        }
        else {
          targetPath = tPath.replace(rPath, root);
        }

        logger('', node.path, relativePath, targetPath);

        if (!fs.existsSync(path.dirname(targetPath))) {
          MakeDirs(path.dirname(targetPath));
        }

        const ws = fs.createWriteStream(targetPath);

        logger(` downloading from ${downloadUrl}...`);

        requestOnStream(downloadUrl, ws, dgitOptions || {}, {
          onSuccess() {
            currentCount++;
            currentSize += node.size;

            logger(` write file ${node.path} succeed. 
                            size: [${currentSize}/${totalStatus.size}], 
                            count: [${currentCount}/${totalStatus.count}]`);

            onProgress
            && onProgress(
              {
                totalCount: totalStatus.count,
                totalSize: totalStatus.size,
                currentSize,
                currentCount,
              },
              node,
            );

            callback();
          },
          onError(err) {
            logger('', err);
            callback(new Error(` request ${downloadUrl} failed.`));
          },
          onRetry() {
            logger(` request ${downloadUrl} failed. Retrying...`);
            onRetry && onRetry();
          },
        });
      },
      (err) => {
        if (err) {
          onError && onError(err);
          onFinish && onFinish();
          onErrorReject(err);
        }
        else {
          onSuccess && onSuccess();
          onFinish && onFinish();
          onSuccessResolve();
        }
      },
    );
  }
  catch (error) {
    onError && onError(error);
    onFinish && onFinish();
    onErrorReject(error);
  }

  return prom;
}

export default dgit;
