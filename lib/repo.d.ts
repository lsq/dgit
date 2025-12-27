declare function repoUtils(owner: string, repoName: string, ref: string, proxy: string | null): {
    getRepoTreeUrl: () => string;
    getDownloadUrl: (path: string) => string;
};
export default repoUtils;
