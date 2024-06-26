---
title: "沉浸式流媒体面临的挑战和启示"
date: 2021-11-14T19:06:10+08:00
draft: false
math: true
keywords: ["Immersive Video"]
tags: ["Immersive Video"]
categories: ["paper"]
url: "posts/papers/note9"
---

## 最终的目标

主要的挑战是用户的临场感，这可以通过避免虚拟的线索来创造出接近真实的世界。

<!--more-->

## 具体的任务

1. 从 360 度视频的采集到显示的过程中，引入了好几种失真。

   应该重点增加新的拼接、投影和分包方式以减少噪音。

2. 除了捕获和使用 360 度视频来表示真实世界和实际交互内容之外，环境中还包括 3D 对象。

   3D 对象的合并对于真实的视图而言是一个挑战。

3. 因为在推流会话中，用户的头部移动高度可变，所以固定的 tiling 方案可能会导致非最优的 viewport 质量。

   推流框架中的 tile 数量应该被动态选择，进而提高推流质量。

4. 自适应的机制应该足够智能来根据环境因素精确地做出适应。

   应该制定基于深度强化学习的策略，来给 360 度视频帧中不同区域的 tile 分配合适的比特率。

5. 用户在 360 度视频中的自由导航很容易让其感觉忧虑自己错过了什么重要的东西。

   在 360 度视频中导航的时候，需要支持自然的可见角度方向。

   丰富的环境应配备新颖的定向机制，以支持 360 度视频，同时降低认知负荷，以克服此问题。

6. 真实的导航依赖 viewport 预测机制。

   现代的预测方式应该使用时空图像特性以及用户的位置信息，采用合适的编解码器卷积 LSTM 结构来减少长期预测误差。

7. 沉浸式的场景随着用户的交互应该发生变化。

   由于用户与场景的交互而产生的新挑战是通过编码和传输透视图创建的。

   因此预测用户的行为来实现对交互内容的高效编码和推流非常关键。

8. 对 360 度视频的质量获取方法和度量手段需要进一步研究。
9. 360 度视频中特殊的音效需要引起注意。
