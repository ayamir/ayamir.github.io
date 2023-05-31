---
title: "修复 Archlinux 上出现的 GPGME Error"
date: 2021-06-11T08:50:43+08:00
draft: false
keywords: ["linux"]
tags: ["linux"]
categories: ["knowledge"]
url: "posts/knowledge/linux/how-to-fix-GPGME-error"
---

## Delete old sync files

```sh
sudo rm /var/lib/pacman/sync/*
```

## Re init pacman-key

```sh
sudo pacman-key --init
```

## Populate key

```sh
sudo pacman-key --populate
```

## Re sync

```sh
sudo pacman -Syyy
```

Now you can update successfully!
