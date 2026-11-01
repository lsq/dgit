"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepoTree = getRepoTree;
const tslib_1 = require("tslib");
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const node_process_1 = tslib_1.__importDefault(require("node:process"));
const async_1 = tslib_1.__importDefault(require("async"));
const utils_1 = require("./cmd/utils");
const log_1 = require("./log");
const repo_1 = tslib_1.__importDefault(require("./repo"));
const request_1 = require("./request");
const UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
const DEFAULT_PARALLEL_LIMIT = 10;
const MAX_PARALLEL_LIMIT = 100;
const JSON_STRINGIFY_PADDING = 2;
// githubLink 解析 + 参数校验，dgit / getRepoTree 共用
function resolveRepoOption(repoOption) {
    const { username, password, token, githubLink } = repoOption;
    let { owner = '', repoName = '', ref = 'master', relativePath = '.', proxy = '', } = repoOption;
    if (githubLink && (0, utils_1.isHttpsLink)(githubLink)) {
        const parseResult = (0, utils_1.ParseGithubHttpsLink)(githubLink);
        owner = parseResult.owner;
        repoName = parseResult.repoName;
        ref = parseResult.ref;
        relativePath = parseResult.relativePath;
    }
    if (!owner || !repoName) {
        throw new Error('invalid repo option.');
    }
    return {
        owner,
        repoName,
        ref,
        relativePath,
        username,
        password,
        token,
        proxy,
    };
}
// 过滤出待下载文件列表：relativePath 前缀 + blob + exclude/include
function filterTreeNodes(treeNodeList, relativePath, exclude, include) {
    return treeNodeList.filter((node) => {
        const nPath = node_path_1.default.resolve(__dirname, node.path);
        const rPath = node_path_1.default.resolve(__dirname, relativePath);
        if (!nPath.startsWith(rPath) || node.type !== 'blob') {
            return false;
        }
        if (exclude.some(v => nPath.startsWith(node_path_1.default.resolve(rPath, v)))
            && include.every(v => !nPath.startsWith(node_path_1.default.resolve(rPath, v)))) {
            return false;
        }
        return true;
    });
}
// ========== 对外接口：获取 download tree 列表，不下载 ==========
function getRepoTree(repoOption, dgitOptions, hooks) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const { owner, repoName, ref, relativePath, username, password, token } = resolveRepoOption(repoOption);
        const logger = (0, log_1.createLogger)(dgitOptions);
        const { exclude = [], include = [] } = dgitOptions || {};
        const { beforeLoadTree, afterLoadTree, onRetry } = hooks || {};
        const { getRepoTreeUrl } = (0, repo_1.default)(owner, repoName, ref);
        const url = getRepoTreeUrl();
        const headers = {
            'User-Agent': UserAgent,
            'Authorization': token
                ? `token ${token}`
                : undefined,
        };
        const auth = username && password
            ? {
                username,
                password,
                sendImmediately: true,
            }
            : undefined;
        const options = {
            url,
            headers,
            auth,
        };
        logger(' request repo tree options.');
        logger(JSON.stringify(options, null, JSON_STRINGIFY_PADDING));
        logger(' loading remote repo tree...');
        beforeLoadTree && beforeLoadTree();
        const body = yield (0, request_1.requestGetPromise)(options, dgitOptions || {}, {
            onRetry() {
                logger(` request ${url} failed. Retrying...`);
                onRetry && onRetry();
            },
        });
        const result = typeof body === 'string'
            ? JSON.parse(body)
            : body;
        if (result.message) {
            // GitHub API 错误响应，透出真实原因
            throw new Error(`github api error: ${result.message}`);
        }
        // console.log('tree api response:', JSON.stringify(result));
        if (!result.tree || result.tree.length <= 0) {
            throw new Error('404 repo not found!');
        }
        logger(' loading remote repo tree succeed.');
        afterLoadTree && afterLoadTree();
        const treeNodeList = result.tree;
        const includeTreeNodeList = filterTreeNodes(treeNodeList, relativePath, exclude, include);
        if (includeTreeNodeList.length <= 0) {
            throw new Error(`404 repo ${relativePath} not found!`);
        }
        return includeTreeNodeList;
    });
}
// https://deepwiki.com/search/python-node-treepythonjula-pyt_e06e7d62-6a9a-4d4b-9e74-0a1cf32f4946?mode=fast
// https://deepwiki.com/search/download-tree_f73bbd59-f23f-4431-998d-646f8bc12c27
function dgit(repoOption, dPath, dgitOptions, hooks) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const { owner, repoName, relativePath, ref, proxy, } = resolveRepoOption(repoOption);
        const logger = (0, log_1.createLogger)(dgitOptions);
        let { parallelLimit = DEFAULT_PARALLEL_LIMIT } = dgitOptions || {};
        if (!parallelLimit || parallelLimit <= 0) {
            logger('parallelLimit value is invalid.');
            parallelLimit = DEFAULT_PARALLEL_LIMIT;
        }
        parallelLimit > MAX_PARALLEL_LIMIT && (parallelLimit = MAX_PARALLEL_LIMIT);
        const { onSuccess, onError, onProgress, onFinish, onRetry, onResolved, beforeLoadTree, afterLoadTree, } = hooks || {};
        let onSuccessResolve = () => { };
        let onErrorReject = () => { };
        const prom = new Promise((resolve, reject) => {
            onSuccessResolve = resolve;
            onErrorReject = reject;
        });
        const { getDownloadUrl } = (0, repo_1.default)(owner, repoName, ref, proxy);
        const destPath = node_path_1.default.isAbsolute(dPath)
            ? dPath
            : node_path_1.default.resolve(node_process_1.default.cwd(), dPath);
        try {
            const includeTreeNodeList = yield getRepoTree(repoOption, dgitOptions, {
                beforeLoadTree,
                afterLoadTree,
                onRetry,
            });
            const totalStatus = includeTreeNodeList.reduce((prev, cur) => {
                if (cur.type === 'blob') {
                    prev.size += cur.size;
                    prev.count++;
                }
                return prev;
            }, { size: 0, count: 0 });
            let currentSize = 0;
            let currentCount = 0;
            onResolved
                && onResolved({
                    currentSize,
                    currentCount,
                    totalSize: totalStatus.size,
                    totalCount: totalStatus.count,
                }, includeTreeNodeList);
            logger(' include files resolved.');
            logger('', JSON.stringify({
                currentSize,
                currentCount,
                totalSize: totalStatus.size,
                totalCount: totalStatus.count,
            }));
            async_1.default.eachLimit(includeTreeNodeList, parallelLimit, (node, callback) => {
                const downloadUrl = getDownloadUrl(node.path);
                const rPath = node_path_1.default.resolve(destPath, relativePath);
                const tPath = node_path_1.default.resolve(destPath, node.path);
                const root = node_path_1.default.resolve(destPath, '.');
                let targetPath;
                if (rPath === tPath) {
                    targetPath = node_path_1.default.resolve(destPath, node_path_1.default.basename(tPath));
                }
                else {
                    targetPath = tPath.replace(rPath, root);
                }
                logger('', node.path, relativePath, targetPath);
                if (!node_fs_1.default.existsSync(node_path_1.default.dirname(targetPath))) {
                    (0, utils_1.MakeDirs)(node_path_1.default.dirname(targetPath));
                }
                const ws = node_fs_1.default.createWriteStream(targetPath);
                logger(` downloading from ${downloadUrl}...`);
                (0, request_1.requestOnStream)(downloadUrl, ws, dgitOptions || {}, {
                    onSuccess() {
                        currentCount++;
                        currentSize += node.size;
                        logger(` write file ${node.path} succeed. 
                            size: [${currentSize}/${totalStatus.size}], 
                            count: [${currentCount}/${totalStatus.count}]`);
                        onProgress
                            && onProgress({
                                totalCount: totalStatus.count,
                                totalSize: totalStatus.size,
                                currentSize,
                                currentCount,
                            }, node);
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
            }, (err) => {
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
            });
        }
        catch (error) {
            onError && onError(error);
            onFinish && onFinish();
            onErrorReject(error);
        }
        return prom;
    });
}
exports.default = dgit;
