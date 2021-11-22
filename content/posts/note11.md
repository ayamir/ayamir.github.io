---
title: "沉浸式流媒体传输的实际度量"
date: 2021-11-22T15:21:59+08:00
draft: false
math: true
keywords: ["Immersive Video"]
tags: ["Immersive Video"]
categories: ["Immersive Video"]
---

##  度量指标

1. viewport预测精度。
   + 使用预测的viewport坐标和实际用户的viewport坐标的大圈距离来量化。
2. 视频质量。
   + viewport内部的tile质量（1～5）。
   + tile在最高质量层之上花费的时间。
   + 根据用户视线的分布而提出的加权质量度量。

## 度量参数

1. 分块策略
2. 带宽
3. 延迟
4. viewport预测
5. HTTP版本
6. 持久化的连接数量
