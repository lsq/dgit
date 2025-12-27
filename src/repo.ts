function repoUtils(owner: string, repoName: string, ref: string, proxy: string | null) {
  return {
    getRepoTreeUrl: () => `https://api.github.com/repos/${owner}/${repoName}/git/trees/${ref}?recursive=1`,
    getDownloadUrl: (path: string) => `${proxy ? `${proxy}/` : ''}https://raw.githubusercontent.com/${owner}/${repoName}/${ref}/${path}`,
  };
}

export default repoUtils;
