import type { AxiosRequestConfig } from 'axios';
import type fs from 'node:fs';
import type { DgitGlobalOption, DgitLifeCycle } from './type';
import axios from 'axios';
import { AddExtraRandomQs } from './cmd/utils';
import { createLogger } from './log';
import {any} from 'async';

const REQUEST_RETRY_DELAY = 1500;
const DEFAULT_MAX_RETRY_COUNT = 5;

const requestGet = async (config: AxiosRequestConfig, maxRetryCount: number, hooks?: DgitLifeCycle): Promise<void> => {
  const {
    onSuccess,
    onError,
    onFinish,
    onRetry,
  } = hooks || {};

  try {
    const response = await axios(config);
    onSuccess && onSuccess(response.data);
    onFinish && onFinish();
  }
  catch (err: any) {
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
}

export function requestGetPromise(config: AxiosRequestConfig, dgitOptions: DgitGlobalOption, hooks?: DgitLifeCycle): Promise<any> {
  return new Promise((resolve, reject) => {
    const { maxRetryCount = DEFAULT_MAX_RETRY_COUNT } = dgitOptions;

    const {
      onSuccess,
      onError,
      onFinish,
      onRetry,
    } = hooks || {};

    const newHooks: DgitLifeCycle = {
      onSuccess(data: any) {
        resolve(data);
        onSuccess && onSuccess(data);
      },
      onError(err: any) {
        reject(err);
        onError && onError(err);
      },
      onFinish,
      onRetry,
    };

    requestGet(config, maxRetryCount, newHooks);
  });
}

export function requestOnStream(url: string, ws: fs.WriteStream, dgitOptions: DgitGlobalOption, hooks?: DgitLifeCycle) {
  const { maxRetryCount = DEFAULT_MAX_RETRY_COUNT } = dgitOptions;

  const logger = createLogger(dgitOptions);

  const {
    onSuccess,
    onError,
    onFinish,
    onRetry,
  } = hooks || {};

  const fn = async (retryCount: number): Promise<void> => {
    const downloadUrl = AddExtraRandomQs(url);
    logger(` dowloading from ${downloadUrl}...`);

    try {
      const response = await axios(
        {
          method: 'GET',
          url: encodeURI(downloadUrl),
          responseType: 'stream',
        },
      );
      response.data.pipe(ws);
    }
    catch (err: any) {
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
  };

  ws.on('finish', () => {
    onSuccess && onSuccess();
    onFinish && onFinish();
  });

  ws.on('error', () => {
    logger(` ${url}, write stream failed.`);
  });

  fn(maxRetryCount);
}
