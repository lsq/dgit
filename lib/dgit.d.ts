import type { DgitGlobalOption, DgitLifeCycle, DgitLoadGitTree, RepoOptionType } from './type';
declare function dgit(repoOption: RepoOptionType, dPath: string, dgitOptions?: DgitGlobalOption, hooks?: DgitLifeCycle & DgitLoadGitTree): Promise<void>;
export default dgit;
