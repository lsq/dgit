"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ora_1 = tslib_1.__importDefault(require("ora"));
const progress_1 = tslib_1.__importDefault(require("progress"));
const dgit_1 = tslib_1.__importDefault(require("../dgit"));
const prompt_1 = require("./prompt");
const utils_1 = require("./utils");
const MAX_TEXT_ELLIPSIS = 30;
function DownloadAction(githubLink, cmd) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let { ref = '', dest = '', owner = '', repoName = '', relativePath = '', password, } = cmd;
        const { exclude = '', include = '', log = false, logPrefix = '[dgit-logger]', } = cmd;
        const { parallelLimit = '', username, token, } = cmd;
        const { proxy = '', } = cmd;
        if (githubLink && (0, utils_1.isHttpsLink)(githubLink)) {
            const parseResult = (0, utils_1.ParseGithubHttpsLink)(githubLink);
            ref = parseResult.ref;
            owner = parseResult.owner;
            repoName = parseResult.repoName;
            relativePath = parseResult.relativePath;
        }
        if (username && !password) {
            const pwdAnswer = yield (0, prompt_1.PasswordPrompt)();
            password = pwdAnswer.password;
        }
        const answer = yield (0, prompt_1.DownloadPrompt)({
            ref,
            dest,
            owner,
            repoName,
            relativePath,
        });
        ref = answer.ref;
        dest = answer.dest;
        owner = answer.owner;
        repoName = answer.repoName;
        relativePath = answer.relativePath;
        const excludeList = exclude.split(',').filter(Boolean);
        const includeList = include.split(',').filter(Boolean);
        const spinner = (0, ora_1.default)(' loading remote repo tree...');
        let bar;
        try {
            yield (0, dgit_1.default)({
                ref,
                owner,
                repoName,
                relativePath,
                username,
                password,
                token,
                proxy,
            }, dest, {
                log,
                logPrefix,
                parallelLimit: Number(parallelLimit.trim()),
                exclude: excludeList,
                include: includeList,
            }, {
                beforeLoadTree() {
                    spinner.start();
                },
                afterLoadTree() {
                    spinner.succeed(' load remote repo tree succeed! ');
                },
                onResolved(status) {
                    if (log)
                        return;
                    const green = '\u001B[42m \u001B[0m';
                    const red = '\u001B[41m \u001B[0m';
                    const index = 0;
                    bar = new progress_1.default(' DOWNLOAD |:bar| :current/:total :percent elapsed: :elapseds eta: :eta :file, done.', {
                        total: status.totalCount,
                        width: 50,
                        complete: green,
                        incomplete: red,
                    });
                    bar.update(index);
                },
                onProgress(_, node) {
                    if (log)
                        return;
                    bar.tick({ file: (0, utils_1.TextEllipsis)(node.path, MAX_TEXT_ELLIPSIS) });
                },
            });
            spinner.succeed(' download all files succeed!');
        }
        catch (error) {
            console.error(error);
            spinner.fail(' download files failed!');
        }
    });
}
exports.default = DownloadAction;
