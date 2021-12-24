---
title: "Note for MPC"
date: 2021-12-23T10:39:32+08:00
draft: false
math: true
keywords: ["DASH", "Control-Theoretic"]
tags: ["DASH", "MPC"]
categories: ["Immersive Video"]
---

## 论文概况

Link：[A Control-Theoretic Approach for Dynamic Adaptive Video Streaming over HTTP](https://dl.acm.org/doi/10.1145/2785956.2787486)

Level：ACM SIGCOMM 15

Keywords：Model Predictive Control，ABR，DASH

## Motivation

关于码率自适应的逻辑，现有的解决方案还没有形成清晰的、一致的意见。不同类型的方案之间优化的出发点并不相同，比如基于速率和基于缓冲区，而且没有广泛考虑各方面的因素并形成折中。

文章引入了控制论中的方法，将各方面的影响因素形式化为*随机优化控制*问题，利用**模型预测控制MPC**将两种不同出发点的解决方案结合到一起，进而解决其最优化的问题。而仿真结果也证明，如果能运行一个最优化的MPC算法，并且预测误差很低，那么MPC方案可以优于传统的基于速率和基于缓冲区的策略。

## 背景

+ 播放器端为QoE需要考虑的问题：
  1. 最小化冲缓冲事件发生的次数；
  2. 在吞吐量限制下尽可能传输码率较高的视频；
  3. 最小化播放器开始播放花费的时间（启动时间）；
  4. 保持播放过程平滑，尽可能避免大幅度的码率变化；
+ 这些目标相互冲突的原因：
  1. 最小化重缓冲次数和启动时间会导致只选择最低码率的视频；
  2. 尽可能选择高码率的视频会导致很多的重缓冲事件；
  3. 保持播放过程平滑可能会与最小的重缓冲次数与最大化的平均码率相冲突；
