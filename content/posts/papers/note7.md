---
title: "自适应策略之viewport依赖型"
date: 2021-11-14T13:24:59+08:00
draft: false
math: true
keywords: ["Immersive Video"]
tags: ["Immersive Video"]
categories: ["paper"]
url: "posts/papers/note7"
---

## 概述

在 360 度视频的推流过程中，根据用户头部的运动自适应地动态选择推流的区域，调整其比特率，以达到节省带宽的目的。

## 通常的实现方式

在服务端提供几个自适应集，来在遇到用户头部的突然运动的情况时，能保证 viewport 的平滑转换。

提出 QER(Quality-focused Regios)的概念使 viewport 内部的视频分辨率高于 viewport 之外的视频分辨率。

非对称的方式以不同的空间分辨率推流来节省带宽。

+ 在播放过程中，客户端根据用户的方向来请求不同分辨率版本的视频。
+ 优点是即使客户端对用户的方面做了错误预测，低质量的内容仍然可以在 viewport 中生成。
+ 缺点是在大多数场景下，这种方案需要巨大的存储开销和处理负载。

## 自适应推流参数

1. 可用带宽和网络吞吐量
2. Viewport 预测的位置
3. 客户端播放器的可用缓冲

## 参数计算公式

+ 第 n 个估计的 Viewport：$V^e(n)$

  $V^e(n) = V_{fb}$

  $V_{fb}$是最新报告的 viewport 位置

+ 第 n 个估计的吞吐量：$T^e(n)$

  $T^e(n) = T_{fb}$

  $T_{fb}$是最新报告的吞吐量

+ 比特率：$R_{bits}$

  $R_{bits} = (1-\beta)T^e(n)$

  $\beta$是安全边缘

+ 第 n 个帧的客观度量质量：$VQ(k)$和最终客观度量质量$VQ$

  $VQ=\frac{1}{L}\sum^L_{k=1}VQ(k)$

  $VQ(k) = \sum_{t=1}^{T^n}w_k(k) * D^n_t(V_t, k)$

  $w_k = \frac{A(t,k)}{A_{vp}}$

  $L=总帧数$

  $w_k$表示在第 k 个帧中与 viewport 所重叠的 tile 程度

  $A(t,k)$表示第 k 个帧中 tile $t$ 重叠的区域

  $A_{vp}$表示 viewport 中总共的区域
