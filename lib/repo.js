"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function repoUtils(owner, repoName, ref, proxy) {
    return {
        getRepoTreeUrl: () => `https://api.github.com/repos/${owner}/${repoName}/git/trees/${ref}?recursive=1`,
        getDownloadUrl: (path) => `${proxy ? `${proxy}/` : ''}https://raw.githubusercontent.com/${owner}/${repoName}/${ref}/${path}`,
    };
}
exports.default = repoUtils;
