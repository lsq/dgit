import type fs from 'node:fs';
import type { CoreOptions, UrlOptions } from 'request';
import type { DgitGlobalOption, DgitLifeCycle } from './type';
type RequestOption = UrlOptions & CoreOptions;
export declare function requestGetPromise(options: RequestOption, dgitOptions: DgitGlobalOption, hooks?: DgitLifeCycle): Promise<any>;
export declare function requestOnStream(url: string, ws: fs.WriteStream, dgitOptions: DgitGlobalOption, hooks?: DgitLifeCycle): void;
export {};
