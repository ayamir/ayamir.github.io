---
title: "沉浸式流媒体传输的实际度量"
date: 2021-11-22T15:21:59+08:00
draft: false
math: true
keywords: ["Immersive Video"]
tags: ["Immersive Video"]
categories: ["paper"]
url: "posts/papers/note11"
---

## 度量指标

1. viewport 预测精度。
   - 使用预测的 viewport 坐标和实际用户的 viewport 坐标的大圈距离来量化。
2. 视频质量。
   - viewport 内部的 tile 质量（1～5）。
   - tile 在最高质量层之上花费的时间。
   - 根据用户视线的分布而提出的加权质量度量。

<!--more-->

## 度量参数

1. 分块策略
2. 带宽
3. 延迟
4. viewport 预测
5. HTTP 版本
6. 持久化的连接数量
