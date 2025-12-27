"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const node_process_1 = tslib_1.__importDefault(require("node:process"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const commander_1 = require("commander");
const action_1 = tslib_1.__importDefault(require("./action"));
const utils_1 = require("./utils");
const EXIT_CODE = 1;
const program = new commander_1.Command();
function Exit() {
    node_process_1.default.exit(EXIT_CODE);
}
function UnknownCommand(cmdName) {
    console.log(`${chalk_1.default.red('Unknown command')} ${chalk_1.default.yellow(cmdName)}.`);
}
const packageInfo = (0, utils_1.GetPackageInfo)();
program.version(packageInfo.version);
program
    .command('download [githubLink]')
    .option('--owner <ownerName>', 'git repo author.')
    .option('--repo-name <repoName>', 'git repo name.')
    .option('--ref <refName>', 'git repo branch, commit hash or tagname.')
    .option('--relative-path <relativePath>', 'specified repo relative path to download.')
    .option('-d, --dest <destPath>', 'specified dest path.')
    .option('-l, --parallel-limit, <number>', 'specified download max parallel limit.')
    .option('-u, --username, <username>', 'specified git account username.')
    .option('-p --password, <password>', 'specified git account password.')
    .option('-t --token, <token>', 'specified git account personal access token.')
    .option('-e --exclude, <relativePath,...,relativePath>', 'indicates which file paths need to be excluded in the current directory.')
    .option('-i --include, <relativePath,...,relativePath>', 'indicates which files need to be included in the exclusion file list.')
    .option('--exact-match', 'enable exact path matching instead of prefix matching.')
    .option('--log', 'output dgit internal log details.')
    .option('--log-prefix, <log>', 'dgit internal log prefix.')
    .option('--proxy, <proxyHttp>', 'dgit proxy download url.')
    .alias('d')
    .description('download the file with the specified path of the remote repo.')
    .action(action_1.default);
program.on('command:*', (cmdObj = []) => {
    const [cmd] = cmdObj;
    if (cmd) {
        program.outputHelp();
        UnknownCommand(cmd);
        Exit();
    }
});
if (node_process_1.default.argv.slice(2).length <= 0) {
    program.help();
}
program.parse(node_process_1.default.argv);
