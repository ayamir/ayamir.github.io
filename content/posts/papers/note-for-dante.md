---
title: "Note for Dante"
date: 2021-12-08T22:14:15+08:00
draft: false
math: true
keywords: ["Immersive Video",]
tags: ["Immersive Video", "UDP", "Heuristic"]
categories: ["paper"]
url: "posts/papers/note-for-dante"
---



## 论文概况

Link: https://dl.acm.org/doi/10.1145/3232565.3234686

Level: SIGCOMM 18

Keyword: UDP+FOV-aware+FEC

## 工作范围

![image.png](https://s2.loli.net/2021/12/08/ZL9TOrxlYV3spiq.png)

## 目标

在给定序列的帧中，为**每个tile**设定FEC冗余，根据其被看到的可能性的加权最小化平均质量降低。

## 问题建模

1. 输入
   估计的丢包率$p$、发送速率$f$、有$n$个tile的$m$个帧($<i, j>$来表示第$i$个帧的第$j$个tile
   
   第$<i, j>$个tile的大小$v_{i, j}$、第$<i, j>$个tile被看到的可能性$\gamma_{i, j}$、

   如果第$<i, j>$ 个tile没有被恢复的质量降低率、最大延迟$T$
   
2. 输出
   
   第$<i, j>$个tile的FEC冗余率$r_{i, j} = \frac{冗余包数量}{原始包数量}$
   
3. 最优化问题的形式化
   $$
   minimize\  \sum_{0<i\le m}\sum_{0<j\le n} \gamma_{i, j}d_{i, j}(p, r_{i, j})
   $$

   
   $$
   subject\ \ to\ \  \frac{1}{f}\sum_{0<i\le m}\sum_{0<j\le n}v_{i, j}(1+r_{i, j}) \le T
   $$
   
   
   $$
   r_{i, j} \le 0
   $$
   
   （1）：最小化最终被看到的tile的质量衰减的加权和，权重按照被看到的可能性分配。
   
   （2）：经过重新编码的包和原始的包需要在T时刻之前发出。
   
   ​      Dante将1个GOP(Group of Pictures)中的所有帧当作一批处理，$T$作为GOP的持续时间
   
   ​      $f$：使用TCP Friendly Rate Control algorithm，基于估计的丢包率和网络延迟来计算得出
   
   （3）：确保冗余率总是非负的。
   
4. 关键变量是$d_{i, j}(p, r)$：丢包率是p情况下，采用r作为冗余率的第$<i, j>$个tile的质量衰减
   $$
   d_{i, j}(p, r) = \delta_{i, j},\ if\ r < \frac{1}{1-p}; 0, otherwise.
   $$

   假设帧中有k个原始包，质量衰减发生在丢失的包不能被恢复的情况下。
   
   FEC可以容忍 $r \cdot k$ 个丢包=>即当 $p(r*k+k)$ 大于  $r*k$  时会发生质量衰减。
   
5. 过多的丢包会导致依赖链上所有帧的质量衰减，因此考虑帧之间的依赖关系之后，可以重新计算质量衰减：
   
   
   $$
   d^{*}_{i, j}(p, r) = \sum_{0<c\le i}w_{c, i}d_{c, j}(p, r)
   $$
   
   
   
   $w_{c, i}$ 编码帧i对帧c的依赖作为单独的第c个帧的质量衰减的权重；
   
   最终第i个帧的第j个tile的最终质量衰减就是所有依赖的质量衰减的和。

## FEC冗余的自适应逻辑

1. 关于$d_{i, j}(p, r)$ ：因为是分段函数，所以其值会因为r和p的大小关系而急剧改变。
   
   利用背包问题的思想可以将其规约成NP完全问题：
   
   将每个tile看作是一个物品，共有m\*n个。
   
   **如果$r_{i, j} < \frac{1}{1-p}$ ，则表示不把第<i,j>和物品放入背包；否则就是将其放入背包。**
   
   公式1可以转化为：最大化所有物品二元变量的线性组合；
   
   公式2可以转化为：二元变量的另一个线性组合必须低于阈值约束。
   
   因此整个问题就能被完全转化为**0-1背包**问题
   
2. 算法
   
   ![image.png](https://s2.loli.net/2021/12/08/BaJvpEsklMQ5XPF.png)
   
   整体上是背包问题的标准解法，能以线性复杂度（因为变量只是B)解决问题。

## 原型设计

![image.png](https://s2.loli.net/2021/12/08/z49bHnQDrfVsNCR.png)

* 使用基于TCP和UDP的两条连接来分别传输控制信息（双向：到客户端的播放会话的起至点和到服务端的网络信息反馈）和视频数据包
* 服务端根据反馈的网络信息，在每个GOP的边界时刻运行算法1来确定下一个GOP的帧和tile的FEC冗余。
  确定之后服务端使用RS码来插入冗余包，和原始视频数据包一起重新编码，并使用基于TFRC的发送率发送数据。
* Dante的实现是对应用程序级比特率适配策略的补充，并且可以通过对视频播放器进行最小更改来替换现有的底层传输协议来部署。

## 实验评估

* 环境：使用Gilbert模型来模拟实现丢包事件（而非使用统一随机丢包）

  创造了两种网络条件good（丢包率0.5%）和bad（丢包率2%）

## 局限性

* 效果主要依赖于Viewport预测的结果是否准确
