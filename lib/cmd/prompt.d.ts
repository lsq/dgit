import { DownloadPromptInfo, PasswordPromptInfo } from './type';
import { Question } from 'inquirer';
export declare const CreatePrompt: (questions: Array<Question>) => Promise<any>;
export declare const DownloadPrompt: (currentInfo: DownloadPromptInfo) => Promise<DownloadPromptInfo>;
export declare const PasswordPrompt: () => Promise<PasswordPromptInfo>;
