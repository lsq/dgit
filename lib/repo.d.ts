declare function repoUtils(owner: string, repoName: string, ref: string, proxy: string): {
    getRepoTreeUrl: () => string;
    getDownloadUrl: (path: string) => string;
};
export default repoUtils;
