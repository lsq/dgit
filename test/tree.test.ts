import type { RepoTreeNode } from '../src/type';
import { expect } from 'chai';
// test/tree.test.ts
import { describe, it } from 'mocha';
import { getRepoTree } from '../src/dgit';
// CI 里通过 env 注入；本地可用 GITHUB_TOKEN=xxx npm run test:mocha
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

describe('getRepoTree 功能测试', () => {
  it('能获取远端仓库指定目录的下载文件列表', async () => {
    const nodes = await getRepoTree(
      {
        owner: 'JohnApache',
        repoName: 'dgit',
        ref: 'master',
        token: GITHUB_TOKEN || undefined,
        relativePath: './src',
      },
      { log: true },
    );

    expect(nodes.length).to.be.greaterThan(0);
    // 所有节点都应位于 src/ 下且为 blob 类型
    nodes.forEach((node: RepoTreeNode) => {
      expect(node.path.startsWith('src')).to.be.equal(true);
      expect(node.type).to.be.equal('blob');
      expect(node.size).to.be.a('number');
    });
  });

  it('单文件 relativePath 返回单节点列表', async () => {
    const nodes = await getRepoTree({
      owner: 'JohnApache',
      repoName: 'hasaki-cli',
      ref: 'master',
      token: GITHUB_TOKEN || undefined,
      relativePath: './PLAN.txt',
    });

    expect(nodes.length).to.be.equal(1);
    expect(nodes[0].path).to.be.equal('PLAN.txt');
  });

  it('能直接使用 githubLink 获取深层目录列表', async () => {
    const nodes = await getRepoTree({
      githubLink: 'https://github.com/JohnApache/hasaki-cli/tree/master/assets/webpack',
      token: GITHUB_TOKEN || undefined,
    });

    const paths = nodes.map(n => n.path);
    expect(paths).to.include('assets/webpack/webpack.config.js');
    expect(paths).to.include('assets/webpack/config/webpack.base.js');
  });

  it('能接受 exclude / include 参数筛选列表', async () => {
    const nodes = await getRepoTree(
      {
        owner: 'JohnApache',
        repoName: 'dgit',
        ref: 'master',
        token: GITHUB_TOKEN || undefined,
        relativePath: './src',
      },
      {
        log: true,
        exclude: ['cmd'], // 排除整个 cmd 目录
        include: ['cmd/main.ts'], // 但 cmd/main.ts 保留（include 优先）
      },
    );

    const paths = nodes.map(n => n.path);
    expect(paths).to.include('src/dgit.ts');
    expect(paths).to.include('src/cmd/main.ts'); // include 命中，保留
    expect(paths).to.not.include('src/cmd/action.ts'); // exclude 命中，排除
  });

  it('repo 不存在时抛出 404 repo not found', async () => {
    try {
      await getRepoTree({
        owner: 'JohnApache',
        repoName: 'repo-that-does-not-exist-xyz',
        ref: 'master',
        token: GITHUB_TOKEN || undefined,
        relativePath: './src',
      });
      expect.fail('should have thrown');
    }
    catch (err: any) {
      expect(err.message).to.be.include('404');
    }
  });

  it('relativePath 下无文件时抛出 404 repo {path} not found', async () => {
    try {
      await getRepoTree({
        owner: 'JohnApache',
        repoName: 'dgit',
        ref: 'master',
        token: GITHUB_TOKEN || undefined,
        relativePath: './dir-not-exist',
      });
      expect.fail('should have thrown');
    }
    catch (err: any) {
      expect(err.message).to.include('404');
      expect(err.message).to.include('not found!');
    }
  });

  it('无效参数抛出 invalid repo option', async () => {
    try {
      await getRepoTree({});
      expect.fail('should have thrown');
    }
    catch (err: any) {
      expect(err.message).to.be.equal('invalid repo option.');
    }
  });

  it('能正确触发 beforeLoadTree / afterLoadTree 钩子', async () => {
    let before = false;
    let after = false;

    await getRepoTree(
      {
        owner: 'JohnApache',
        repoName: 'dgit',
        ref: 'master',
        token: GITHUB_TOKEN || undefined,
        relativePath: './src',
      },
      {},
      {
        beforeLoadTree() { before = true; },
        afterLoadTree() { after = true; },
      },
    );

    expect(before).to.be.equal(true);
    expect(after).to.be.equal(true);
  });
});
