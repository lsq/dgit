"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
const DEFAULT_PREFIX = '[dgit-logger]';
function createLogger(option) {
    return (...message) => {
        if (option && option.log) {
            const prefix = option
                ? option.logPrefix || DEFAULT_PREFIX
                : DEFAULT_PREFIX;
            console.log(prefix, ...message, '\n');
        }
    };
}
