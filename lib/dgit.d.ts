import type { DgitGlobalOption, DgitLifeCycle, DgitLoadGitTree, RepoOptionType, RepoTreeNode } from './type';
export { DgitGlobalOption, DgitLifeCycle, DgitLoadGitTree, GithubRelativePath, ProgressStatus, RepoOptionType, RepoTreeNode, } from './type';
export declare function getRepoTree(repoOption: RepoOptionType, dgitOptions?: DgitGlobalOption, hooks?: DgitLoadGitTree & Pick<DgitLifeCycle, 'onRetry'>): Promise<RepoTreeNode[]>;
declare function dgit(repoOption: RepoOptionType, dPath: string, dgitOptions?: DgitGlobalOption, hooks?: DgitLifeCycle & DgitLoadGitTree): Promise<void>;
export default dgit;
