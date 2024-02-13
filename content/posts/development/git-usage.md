---
title: "Git 常用用法记录"
date: 2024-01-23T09:50:29+08:00
draft: false
math: true
keywords: ["git"]
tags: ["git"]
categories: ["development"]
url: "posts/development/git-usage"
---

这篇博客用来记录平时用到的一些 Git 操作，用到之后会不定时更新。

## clone 相关

克隆指定 branch ： `git clone --branch <branch-name> <remote-repo-url>`

递归克隆（包括submodule）：`git clone --recursive`

已经 clone 完的仓库：`git submodule update --init --recursive`

## checkout 相关

切换分支：`git checkout <branch-name>` / `git switch <branch-name>`

新建分支：`git checkout -b <branch-name>` / `git switch -c <branch-name>`

切换到一个 tag ：`git fetch --all --tags --prune` -> `git tag` -> 使用 `/` 快速搜索 -> `git checkout tags/<tag-name> -b <branch-name>`

## commit 相关

undo 本地改动（还未 commit）：`git restore <file-path>`

修改 commit 消息（还未 push）：`git commit --amend`

undo 前 1 次 commit（还未 push）：`git reset --soft HEAD~`

undo 前 2 次 commit（还未 push）：`git reset --soft HEAD~2`

undo 某次 commit（已经 push）：`git revert <commit-hash>`

undo 某个区间内的 commit（已经 push）：

`git revert --no-commit <left-commit-hash>..<right-commit-hash>` （左开右闭） -> `git commit`

## 协作相关

Review 并且 Commit 别人提出的 PR 的流程：

1. `git remote add <remote-name> <remote-repo-url>`

2. `git remote -v`

3. `git fetch <remote-name>`

4. `git checkout -b <local-branch-name> <PR-branch-name>`

5. `git commit -sm "<commit-message>"`

6. `git push <remote-name> HEAD:<PR-branch-name>`
