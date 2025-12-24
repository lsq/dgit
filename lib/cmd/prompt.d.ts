import type { Question } from 'inquirer';
import type { DownloadPromptInfo, PasswordPromptInfo } from './type';
export declare const CreatePrompt: (questions: Array<Question>) => Promise<any>;
export declare function DownloadPrompt(currentInfo: DownloadPromptInfo): Promise<DownloadPromptInfo>;
export declare function PasswordPrompt(): Promise<PasswordPromptInfo>;
