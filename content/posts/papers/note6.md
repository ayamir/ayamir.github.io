---
title: "沉浸式流媒体现有标准"
date: 2021-11-11T20:08:03+08:00
draft: false
math: true
keywords: ["Immersive Video"]
tags: ["Immersive Video"]
categories: ["paper"]
---

## OMAF(Omnidirectional Media Format)

`OMAF`是第1个国际化的沉浸式媒体格式，描述了对360度视频进行编码、演示、消费的方法。

`OMAF`与与现有格式兼容，包括编码（例如`HEVC`），文件格式（例如`ISOBMFF`），交付信号（例如`DASH`，`MMT`）。

`OMAF`中还包括编码、投影、分包和viewport方向的元数据。

## OMAF+DASH->MPD

OMAF与DASH相结合，再加上一些额外的描述构成了MPD文件格式，用于向客户端通知360度媒体的属性。

OMAF规定了9中媒体配置文件，包括3种视频配置文件：基于HEVC的viewport独立型、基于HEVC的viewport依赖型、基于AVC的viewport依赖型。

OMAF为视角独立型的推流提供了无视viewport位置的连续的视频帧质量。

常规的HEVC编码方式和DASH推流格式可以用于viewport独立型的推流工作。

但是使用HEVC/AVC编码方式的基于viewport的自适应操作是OMAF的一项技术开发，允许无限制地使用矩形RWP来增强viewport区域的质量。

## CMAF(Common Media Application Format)

致力于提供跨多个应用和设备之间的统一的编码格式和媒体配置文件。

CMAF使请求低延迟的segment成为可能。

## ISOBMFF(ISO Base Media File Format)

ISOBMFF是用于定时数据交换、管理和显示的最流行的文件格式。

+ 文件由一系列兼容并且可扩展的文件级别的box组成。
+ 每个box表示1个由4个指针字符代码组成的数据结构。
+ ISOBMFF的媒体数据流和元数据流被分别分发。

	- 媒体数据流中包括编码过的音频和视频数据。
	- 元数据流中包括媒体类型、编码属性、时间戳、大小等元数据，也包括全向内容的额外信息如投影格式、旋转、帧分包、编码和分发等元数据。
+ ISOBMFF为了访问方便，保证有价值信息能灵活聚合。

## 3DoF(3 Degree of Freedom)

在3DoF场景中，用户可以自由的移动头部以三个方向：摆动、俯仰、旋转。

## 3DoF+

用户的头部可以以任意方向移动：上下、左右、前后

## 6DoF

不只用户的头部，用户的身体也是自由的。同时支持方向与位置的自由。

