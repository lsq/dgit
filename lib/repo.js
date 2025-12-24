"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repoUtils = (owner, repoName, ref, proxy) => ({
    getRepoTreeUrl: () => `https://api.github.com/repos/${owner}/${repoName}/git/trees/${ref}?recursive=1`,
    getDownloadUrl: (path) => `${proxy ? `${proxy}/` : ''}https://raw.githubusercontent.com/${owner}/${repoName}/${ref}/${path}`,
});
exports.default = repoUtils;
