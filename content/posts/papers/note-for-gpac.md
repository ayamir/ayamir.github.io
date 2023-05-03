---
title: "Note for GPAC"
date: 2021-12-30T10:23:26+08:00
draft: false
math: true
keywords: ["Immersive Video", "DASH", "Tile"]
tags: ["Immersive Video", "DASH"]
categories: ["paper"]
---

## Dash客户端自适应逻辑

1. *tile priority setup*：根据定义的规则对tile进行优先级排名。
2. *rate allocation*：收集网络吞吐量信息和tile码率信息，使用确定的tile优先级排名为其分配码率，努力最大化视频质量。
3. *rate adaption*：在播放过程中，执行码率自适应算法，基于播放速度、质量切换的次数、缓冲区占用情况等。

### tile priority setup

1. Dash客户端加载带有SRD信息的MPD文件时，首先确定使用SRD描述的tile集合。

2. 确定tile之间的编码依赖（尤其是使用HEVC编码的tile时）

3. 为每个独立的tile向媒体渲染器请求一个视频对象，并向其通知tile的SRD信息。

4. 渲染器根据需要的显示大小调整SRD信息之后，执行视频对象的最终布局。

5. 一旦tile集合被确定，客户端向每个tile分配优先级。（每次码率自适应执行的时候都需要分配tile优先级）

   ![image-20211230103917112](https://s2.loli.net/2021/12/30/8i7EFYkSwefPMzR.png)

### Rate allocation

1. 首先需要估计可用带宽（tile场景和非tile场景的估计不同）
2. 在一个视频段播放过程中，客户端需要去下载多个段（并行-HTTP/2）
3. 带宽可以在下载单个段或多个段的平均指标中估计出来。
4. 一旦带宽估计完成，码率分配将tile根据其优先级进行分类。
5. 一开始所有的tile都分配成最低的优先级对应的码率，然后从高到低依次增长优先级高的tile的码率。
6. 一旦每个tile的码率分配完成，将为目标带宽等于所选比特率的每个tile调用常规速率自适应算法
