import type { AxiosRequestConfig } from 'axios';
import type fs from 'node:fs';
import type { DgitGlobalOption, DgitLifeCycle } from './type';
export declare function requestGetPromise(config: AxiosRequestConfig, dgitOptions: DgitGlobalOption, hooks?: DgitLifeCycle): Promise<any>;
export declare function requestOnStream(url: string, ws: fs.WriteStream, dgitOptions: DgitGlobalOption, hooks?: DgitLifeCycle): void;
