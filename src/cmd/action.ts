import type { Command } from 'commander';
import type { Ora } from 'ora';
import type { CommandInfo } from './type';
import ora from 'ora';
import ProgressBar from 'progress';
import dgit, { getRepoTree } from '../dgit';

import { DownloadPrompt, PasswordPrompt } from './prompt';
import {
  isHttpsLink,
  ParseGithubHttpsLink,
  TextEllipsis,
} from './utils';

const MAX_TEXT_ELLIPSIS = 30;

async function DownloadAction(githubLink: string | undefined, cmd: Command & CommandInfo): Promise<any> {
  let {
    ref = '',
    dest = '',
    owner = '',
    repoName = '',
    relativePath = '',
    password,
  } = cmd;

  const {
    exclude = '',
    include = '',
    log = false,
    logPrefix = '[dgit-logger]',
    exactMatch = false, // 是否精确匹配
  } = cmd;

  const {
    parallelLimit = '',
    username,
    token,
  } = cmd;
  const {
    proxy = '',
    treeOnly = false,
  } = cmd;

  if (githubLink && isHttpsLink(githubLink)) {
    const parseResult = ParseGithubHttpsLink(githubLink);
    ref = parseResult.ref;
    owner = parseResult.owner;
    repoName = parseResult.repoName;
    relativePath = parseResult.relativePath;
  }

  if (username && !password) {
    const pwdAnswer = await PasswordPrompt();
    password = pwdAnswer.password;
  }

  const answer = await DownloadPrompt({
    ref,
    dest,
    owner,
    repoName,
    relativePath,
  });

  ref = answer.ref;
  dest = answer.dest;
  owner = answer.owner;
  repoName = answer.repoName;
  relativePath = answer.relativePath;

  const excludeList = exclude.split(',').filter(Boolean);
  const includeList = include.split(',').filter(Boolean);

  const spinner: Ora = ora(' loading remote repo tree...');
  let bar: ProgressBar;

  const repoOption
    = {
      ref,
      owner,
      repoName,
      relativePath,
      username,
      password,
      token,
      proxy,
      treeOnly,
    };
  const dgitOptions
    = {
      log,
      logPrefix,
      parallelLimit: Number(parallelLimit.trim()),
      exclude: excludeList,
      include: includeList,
      exactMatch,
    };
  const treeHooks
    = {
      beforeLoadTree() {
        spinner.start();
      },
      afterLoadTree() {
        spinner.succeed(' load remote repo tree succeed! ');
      },
    };
  // tree 模式：只输出文件列表，不下载
  if (treeOnly) {
    try {
      const nodes = await getRepoTree(repoOption, dgitOptions, treeHooks);
      nodes.forEach((node) => {
        console.log(`${node.path} ${node.size}B`);
      });
      spinner.succeed(' list download tree succeed!');
    }
    catch (error) {
      console.error(error);
      spinner.fail(' list download tree failed!');
    }
    return;
  }

  try {
    await dgit(
      repoOption,
      dest,
      dgitOptions,
      {
        ...treeHooks,
        onResolved(status) {
          if (log)
            return;
          const green = '\u001B[42m \u001B[0m';
          const red = '\u001B[41m \u001B[0m';
          const index = 0;
          bar = new ProgressBar(
            ' DOWNLOAD |:bar| :current/:total :percent elapsed: :elapseds eta: :eta :file, done.',
            {
              total: status.totalCount,
              width: 50,
              complete: green,
              incomplete: red,
            },
          );
          bar.update(index);
        },
        onProgress(_, node) {
          if (treeOnly) {
            return;
          }
          if (log)
            return;
          bar.tick({ file: TextEllipsis(node.path, MAX_TEXT_ELLIPSIS) });
        },
      },
    );
    spinner.succeed(treeOnly ? 'Parsing download tree list succeed!' : ' download all files succeed!');
  }
  catch (error) {
    console.error(error);
    spinner.fail(' download files failed!');
  }
}

export default DownloadAction;
