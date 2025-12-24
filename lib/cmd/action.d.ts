import type { Command } from 'commander';
import type { CommandInfo } from './type';
declare function DownloadAction(githubLink: string | undefined, cmd: Command & CommandInfo): Promise<any>;
export default DownloadAction;
