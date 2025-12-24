import type { DgitGlobalOption } from './type';

const DEFAULT_PREFIX = '[dgit-logger]';

export function createLogger(option?: DgitGlobalOption) {
  return (...message: any[]) => {
    if (option && option.log) {
      const prefix = option
        ? option.logPrefix || DEFAULT_PREFIX
        : DEFAULT_PREFIX;
      console.log(prefix, ...message, '\n');
    }
  };
}
