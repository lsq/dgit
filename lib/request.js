"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestGetPromise = requestGetPromise;
exports.requestOnStream = requestOnStream;
const tslib_1 = require("tslib");
const axios_1 = tslib_1.__importDefault(require("axios"));
const utils_1 = require("./cmd/utils");
const log_1 = require("./log");
const REQUEST_RETRY_DELAY = 1500;
const DEFAULT_MAX_RETRY_COUNT = 5;
function requestGet(config, maxRetryCount, hooks) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const { onSuccess, onError, onFinish, onRetry, } = hooks || {};
        try {
            const response = yield (0, axios_1.default)(config);
            onSuccess && onSuccess(response.data);
            onFinish && onFinish();
        }
        catch (err) {
            if (maxRetryCount < 1) {
                onError && onError(err);
                onFinish && onFinish();
                return;
            }
            setTimeout(() => {
                onRetry && onRetry();
                requestGet(config, maxRetryCount - 1, hooks);
            }, REQUEST_RETRY_DELAY);
        }
    });
}
function requestGetPromise(config, dgitOptions, hooks) {
    return new Promise((resolve, reject) => {
        const { maxRetryCount = DEFAULT_MAX_RETRY_COUNT } = dgitOptions;
        const { onSuccess, onError, onFinish, onRetry, } = hooks || {};
        const newHooks = {
            onSuccess(data) {
                resolve(data);
                onSuccess && onSuccess(data);
            },
            onError(err) {
                reject(err);
                onError && onError(err);
            },
            onFinish,
            onRetry,
        };
        requestGet(config, maxRetryCount, newHooks);
    });
}
function requestOnStream(url, ws, dgitOptions, hooks) {
    const { maxRetryCount = DEFAULT_MAX_RETRY_COUNT } = dgitOptions;
    const logger = (0, log_1.createLogger)(dgitOptions);
    const { onSuccess, onError, onFinish, onRetry, } = hooks || {};
    const fn = (retryCount) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const downloadUrl = (0, utils_1.AddExtraRandomQs)(url);
        logger(` dowloading from ${downloadUrl}...`);
        try {
            const response = yield (0, axios_1.default)({
                method: 'GET',
                url: encodeURI(downloadUrl),
                responseType: 'stream',
            });
            response.data.pipe(ws);
        }
        catch (err) {
            if (retryCount <= 0) {
                onError && onError(err);
                onFinish && onFinish();
                return;
            }
            setTimeout(() => {
                onRetry && onRetry();
                fn(retryCount - 1);
            }, REQUEST_RETRY_DELAY);
        }
    });
    ws.on('finish', () => {
        onSuccess && onSuccess();
        onFinish && onFinish();
    });
    ws.on('error', () => {
        logger(` ${url}, write stream failed.`);
    });
    fn(maxRetryCount);
}
