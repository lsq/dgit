import type { GithubLinkInfo, PackageInfo } from './type';
export declare function GetPackageInfo(): PackageInfo;
export declare const GITHUB_ADDRESS = "https://github.com/";
export declare const isHttpsLink: (link: string) => boolean;
export declare function ParseGithubHttpsLink(httpsLink: string): GithubLinkInfo;
export declare const TextEllipsis: (text: string, maxLen: number) => string;
export declare function MakeDirs(dirs: string): void;
export declare function AddExtraRandomQs(origin: string): string;
