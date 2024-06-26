---
title: "自适应360度视频推流挑战"
date: 2021-11-04T11:01:18+08:00
draft: false
math: true
keywords: ["Immersive Video"]
tags: ["Immersive Video"]
categories: ["paper"]
url: "posts/papers/note5"
---

# 背景

用户使用头戴设备比使用传统显示器观看 360 度视频内容时的满意度对于扰乱更加敏感。

沉浸式的体验受到不完美的视角预测和高度动态化的网络状况的消极影响。

<!--more-->

目前主要面临的挑战有以下 4 个：

![image-20211104111113514](https://i.loli.net/2021/11/04/BOIuq9Ws7obHS3i.png)

## Viewport 预测

### 背景

HMD 的本质特征是快速响应用户头部的移动。当用户改变 viewport 时 HMD 处理交互并检测相关的 viewport 来精确播放器的信息，这样视野就能以正常的可视角度被提供给用户。Viewport 预测在优化的 360 度视频推流中非常必要。配备有位置传感器的可穿戴 HMD 允许客户端更新其视角方向相应的视角场景。

### 分类

- *内容不可知*的方式基于历史信息对 viewport 进行预测。
- *内容感知*的方式需要视频内容信息来预测未来的 viewport。

### 内容不可知方式

#### 分类

- 平均线性回归 LR
- 航位推算 DR
- 聚类
- 机器学习 ML
- 编解码器体系结构

#### 现有成果

##### Qian's work——LR

使用平均线性回归和加权线性回归模型来做 viewport 预测，之后对与预测区域重叠的 tile 进行整体推流。

- 当预测后 0.5s、1s、2s 加权线性回归表现更好

##### Petrangeli's work——LR

将被划分成 tile 的等矩形的帧分成 3 个区域：viewport 区、相邻区、其他区。

结合观察者头部的移动，将可变比特率分配给可见和不可见区域。

作者利用最近（100 毫秒）用户观看历史的线性外推来预测未来的注视点。

##### Mavlankar and Girod's work——运动向量

使用运动向量比如观察者的平移、倾斜、缩放等方向上的速度和加速度，来执行视角区域预测。

##### La Fuente's work——运动向量

考虑了两种预测变体：角速度和角加速度，从用户以前的方向数据来估计未来的头部方向。按照预测结果分配不同的量化参数到每个 tile 上。

当进行进一步的预测时（超过 2s），这种方式限制了预测的精度。

如果视频 tile 被基于错误的预测而被请求，用户的实际 viewport 可能会被没有请求因而没有内容的黑色 tile 所覆盖。

##### Ban's work——KNN+LR

使用 KNN 算法利用跨用户观看历史，使用 LR 模型利用户个体化的行为。

就视角预测的准确率而言，分别取得了 20%和 48%的绝对和相对改进。

##### Liu's work——cluster

提出了使用数据融合方法，通过考虑几个特征来估计未来视角位置。特征例如：用户的参与度、用户观看同一视频的行为、单个用户观看多个视频的行为、最终用户设备、移动性水平。

##### Petrangeli's work——cluster

基于车辆轨迹预测的概念，考虑了类似的轨迹形成一个簇来预测未来的 viewport。

结果表明这种方法为更长的视野提高了精确度。

检查了来自三个欧拉角的不同轨迹，这样做可能导致性能不足。

##### Rossi's work——cluster

提出了一种聚类的方法，基于球形空间中有意义的 viewport 重叠来确认用户的簇。

基于 Bron-Kerbosch（BK）算法的聚类算法能够识别大量用户，这些用户观看的是相同的 60%的 3s 长球形视频块。

与基准相比，该方法为簇提供了可兼容且重要的几何 viewport 重叠。

##### Jiang's work

背景：

LR 方法对于长期的预测视野会导致较差的预测精度。长短时记忆（LSTM）是一种递归神经网络（RNN）架构，适用于序列建模和模式开发。

方法：

为了在 FoV 预测中获取比 LR 方法更高的精确度，开发了一种使用带有 128 个神经元的 LSTM 模型的 viewport 预测方法。

- 分析了 360 度数据集，观察到用户在水平方向头部有快速转向，但是在垂直方向几乎是稳定的。
- 实验表明，这种方法同时考虑水平和垂直方向的头部移动时，比 LR 等方法产生了更少的预测错误。

##### Bao's work

背景：

对 150 个用户进行了 16 个视频剪辑的主观实验，并对其行为进行了分析。

使用 3 个方向的欧拉角$\theta$, $\phi$, $\psi$来表示用户在 3D 空间中头部的移动，结果表明不同方向的动作有强自相关性和消极的互相关性。因此多个角度的预测可以分开进行。

方法：

开发两个独立的 LSTM 模型来分别预测$\theta$和$\phi$，之后将预测结果应用于目标区域流来有效利用可用网络资源。

##### Hou's work

- 提出一种基于深度学习的视角产生方法来只对提前预测的 360 度视频和 3 自由度的 VR 应用的 viewport tile 进行抽取和推流。（使用了大规模的数据集来训练模型）
- 使用包含多层感知器和 LSTM 模型来预测 6 自由度的 VR 环境中头部乃至身体的移动，预测的视野被预渲染来做到低延迟的 VR 体验。

##### Heyse's work

背景：

在某些例子中，用户的移动在视频的不同部分中非常不稳定。这增加了机器学习方式的训练压力。

方法：

提出了一个基于 RL 模型的上下文代理，这个模型首先检测用户的显著移动，然后预测移动的方向。这种分层自学习执行器优于球形轨迹外推法（这种方法将用户运动建模为轨迹的一部分，而不是单位球体上的完整轨迹）

##### Qian's work

提出了一种叫做 Flare 的算法来最小化实际 viewport 和预测 viewport 之间的不匹配。

- 应用了一种 ML 方法来执行频繁的 viewport 预测，包括从 130 名用户收集的 1300 条头部运动轨迹的 4 个间隔。
- 使用 viewport 轨迹预测，Flare 可以将错误预测替换成最新预测。

##### Yu and Liu's work

背景：

LSTM 网络本身具有耗时的线性训练特性。编解码器的 LSTM 模型把训练过程并行化，相比于 LR 和 LSTM 本身而言，改善了预测精度。

方法：

使用基于注意力的 LSTM 编解码器网络体系结构来避免昂贵的递归并能更好地捕获 viewport 变化。

- 提出的体系结构相比于传统的 RNN，获得了更高的预测精度，更低的训练复杂度和更快的收敛。

##### Jamali's work

提出使用 LSTM 编解码器网络来做长期的 viewport 预测（例如 3.5s）。

收集了低延迟异质网络上跨用户的方向反馈来调整高延迟网络上目标用户的预测性能。

### 内容感知方式

#### 背景

内容感知方式可以提高预测效率。

#### 具体方法

##### Aladagli's work

提出了一个显著性驱动的模型来提高预测精度。

- 没有考虑用户在 360 度视频中的视角行为。
- viewport 预测错误可以通过理解用户对 360 度视频独特的可见注意力最小化。

##### Nguyen's work

背景：

大多数现存的方法把显著性图看作是 360 度显示中的位置信息来获得更好的预测结果。

通用的显著性和位置信息体系结构基于固定预测模型。

方法：

提出了`PanoSalNet`来捕获用户在 360 度帧中独特的可见注意力来改善显著性检测的性能。

- 同时使用 HMD 特性和显著性图的固定预测模型获得了可测量的结果。

##### Xu's work

提出了两个 DRL(Deep Reinforcement Learning)模型用于同时考虑运动轨迹和可见注意力特性的 viewport 预测网络。

- 离线模型基于内容流行度检测每个帧里的显著性。
- 在线模型基于从离线模型获得的显著性图和之前的 viewport 预测信息预测 viewport 方向和大小。
- 这个网络只能预测 30ms 的下一个 viewport 位置。

##### Xu's work

收集了大规模的被使用带有眼部轨迹跟踪的 HMD 的 45 个观测者观察的动态 360 度视频数据集，提出了基于历史扫描路径和图像特征预测注视位移的方法。

- 在与当前注视点、viewport 和整个图像相关的三个空间尺度上执行了显著性计算。
- 可能的图像特性被通过向 CNN 喂图像和相应的显著性图，同时 LSTM 模型捕获历史信息来抽取出来。
- 之后将 LSTM 和 CNN 特性耦合起来，用于下一次的用户注视信息预测。

##### Fan's work

用户更容易被运动的物体吸引，因此除了显著性图之外，Fan 等人也考虑了使用预训练 的 CNN 来估计用户未来注视点的内容运动图。

- 由于可能存在多个运动，这让预测变得不可靠，因此运动贴图的开发还需要进一步的研究。

##### Yang's work

- 使用 CNN 模型基于历史观测角度信息预测了单 viewport。
- 接着考虑了一种使用内容不可知和内容感知方法如 RNN 和 CFVT 模型的融合层的 viewport 轨迹预测策略。
- 融合模型使其同时支持更好地预测并且提高了大概 40%的精度。

##### Ozcinar's work

将 viewport 轨迹转换为基于 viewport 的视觉注意图，然后对不同大小的 tile 进行推流以保证更高的编码效率。

##### Li's work

现有的预测模型对未来的预测能力有限，Li 等人提出了两种模型，分别用于 viewport 相关和基于 tile 的推流系统。

- 第一个模型应用了基于用户轨迹的 LSTM 编解码网络体系结构。
- 第二个模型应用了卷积 LSTM 编解码体系结构，使用序列的热图来预测用户的未来方向。

### 总结

精确的方向预测使 360 度视频的客户端可以以高分辨率下载最相关的 tile。

当前采用显著性和位置信息的神经网络模型的性能比直接利用当前观察位置进行未来 viewport 位置估计的简单无运动的基线方法表现差。估计的显著性中的噪音等级限制了这些模型的预测精度。并且这些模型也引入了额外的计算复杂度。

对于 360 度视频注意点的可靠预测和用户观看可能性与显著性图之间关系的理解，显著性模型必须被改善并通过训练大规模的数据集来适应，尤其是被配备了不同摄像机旋转的镜头所捕获的数据。

另一方面，卷积 LSTM 编解码器和基于轨迹的预测方法适合长期预测，并能带来相当大的 QoE 改进，特别是在协作流媒体环境中。

## QoE 评估

### 背景

由于全方位视频非常普遍，因此，通过这种类型的视频分发来确定用户的特定质量方面是至关重要的。QoE 在视频推流应用中扮演着重要角色。在传统视频推流中，QoE 很大程度上被网络负载和分发性能所影响。现有的次优目标度量方法并不适用于全向视频，因为全向视频受网络状况和用户视角行为的影响很大。

### 主观质量评估

主观质量评估是估计 360 度视频推流质量的现实并且可靠的方法。

#### Upenik's work

用一台 MergeVR HMD 执行了主观测试来体验 360 度图像。

- 实验数据包括主观分数、视角轨迹、在每个图像上花费的时间由软件上获得。
- 视角方向信息被用于计算显著性图。
- 但是这项研究没有考虑对 360 度视频的评估。

#### Zhang's work

为了弥补 360 度视频和常规视频度量方式之间的性能差距，为全景视频提出了一种主观质量评估方法，称为*SAMPVIQ*。

- 23 位参与者被允许观看 4 个受损视频，整体视频质量体验的评分在 0～5 分之间。
- 参与者之间存在较大的评分差异。

#### Xu's work

提出两种主观测量方式：总体区分平均意见分数(O-DMOS)和矢量区分平均意见分数(V-DMOS)来获得 360 度视频的质量损失。

- 类似于传统食品的 DMOS 度量方式，O-DMOS 度量方式计算主观测试序列的总计区分分数。

#### Schatz's work

研究了使用 HMD 观看 360 度内容时停顿事件的影响。

- 沉浸式内容的主观质量评估并非不重要，可能导致比实际推荐更多的开放性问题。
- 通常来讲人们的期望于传统的 HAS 相似，即如果可能的话，根本没有停顿。

#### 可用的开源工具

AVTrack360，OpenTrack 和 360player 能捕获用户观看 360 度视频的头部轨迹。

VRate 是一个在 VR 环境中提供主观问卷调查的基于 Unity 的工具。

安卓应用*[MIRO360](https://github.com/zerepolbap/miro360)*，支持未来 VR 主观测试的指南开发。

#### `Cybersickness`

`Cybersickness`是一种获得高 QoE 的潜在障碍，它能引起疲劳、恶心、不适和呕吐。

##### Singla's work

使用受限的带宽和分辨率，在不同的延迟情况下进行了两个主观实验。

- 开发了主观测试平台、测试方法和指标来评估 viewport 自适应 360 度视频推流中的视频感知等级和`Cybersickness`。
- 基于 tile 的推流在带宽受限的情况下表现很好。
- 47ms 的延迟实际上不影响感知质量。

##### Tran's work

考虑了几个影响因子例如内容的空间复杂性，数量参数，分辨率特性和渲染模型来评估 cybersickness，质量，可用性和用户的存在。

- VR 环境中快速移动的内容很容易引发 cybersickness。
- 由于高可用性和存在性，用户的 cybersickness 也可能加剧。

##### Singla's work

评估了 28 名受试者在 Oculus Rift 和 HTC Vive 头戴式电脑上观看 6 个全高清和超高清分辨率 YouTube 视频时的观看不适感。

- HMD 的类型轻微地影响感知质量。
- 分辨率和内容类型强烈影响个人体验。
- 女性用户感到`cybersickness`的人数更多。

#### 空间存在感

空间存在感能增强沉浸感。

##### Zou's work

方法：

提出了一个主观框架来测量 25 名受试者的空间存在感。

- 提出的框架包括三层，从上到下分别为：空间存在层、感知层、科技影响层。
- 心理上的空间存在感形成了空间存在层。
- 感知层以视频真实感、音频真实感和交互元素为特征。
- 科技影响层由几个模块组成，这些模块与感知层相连，以反映传感器的真实性。

##### Hupont's work

应用通用感知的原则来研究在 Oculus HMD 和传统 2D 显示器上玩游戏的用户的空间存在感。

- 与 2D 显示器相比，3D 虚拟现实主义显示出更高的惊奇、沉浸感、存在感、可用性和兴奋感。

#### 生理特征度量

##### Salgado's work

方法：

捕获多种多样的生理度量，例如心率 HR，皮肤电活性 EDA、皮肤温度、心电图信号 ECG、呼吸速率、血压 BVP、脑电图信号 EEG 来评价沉浸式模拟器的质量。

##### Egan's work

基于 HR 和 EDA 信号评估 VR 和非 VR 渲染模式质量分数。

- 相比于 HR，EDA 对质量分数有强烈的影响。

#### 技术因素感知

不同的技术和感知特征，如失真、清晰度、色彩、对比度、闪烁等，用于评估感知视频质量。

##### Fremerey's work

确定了可视质量强烈地依赖于应用的运动插值（MI）算法和视频特征，例如相机旋转和物体的运动。

在一项主观实验中，12 位视频专家回顾了使用 FFmpeg 混合、FFmpeg MCI（运动补偿插值）和 butterflow 插值到 90 fps 的四个视频序列。作者发现，与其他算法相比，MCI 在 QoE 方面提供了极好的改进。

#### 总结

主观测试与人眼直接相关，并揭示了 360 度视频质量评估的不同方面的影响。

在这些方面中，空间存在感和由佩戴 VR 头戴设备观看 360 度视频导致的*cybersickness*极为重要，因为这些效果并不在传统的 2D 视频观看中出现。

主观评估需要综合的手工努力并因此昂贵耗时并易于出错，相对而言，客观评估更易于管理和可行。

### 客观质量评估

由于类似的编码结构和 2D 平面投影格式，对 360 度内容应用客观质量评估很自然。

#### 计算 PSNR

现有投影方式中的采样密度在每个像素位置并不均匀。

##### Yu's work

为基于球形的 PSNR 计算引入 S-PSNR 和 L-PSNR。

- S-PSNR 通过对球面上所有位置的像素点做同等加权来计算 PSNR。
- 利用插值算法，S-PSNR 可以完成对支持多种投影模式的 360 度视频的客观质量评估。
- L-PSNR 通过基于纬度和访问频率的像素点加权测量 PSNR。
- L-PSNR 可以测量 viewport 的平均 PSNR 而无需特定的头部运动轨迹。

##### Zakharchenko's work

提出了一种 Craster Parabolic Projection-PSNR (CPP-PSNR) 度量方式来比较多种投影方案，通过不改变空间分辨率和不计算实际像素位置的 PSNR，将像素重新映射成 CPP 投影。

- CPP 投影方式可能使视频分辨率大幅下降。

##### Sun's work

提出了一种叫做 weighted-to-spherically-uniform PSNR (WS-PSNR)的质量度量方式，以此来测量原始和受损内容之间的质量变化。

- 根据像素在球面上的位置考虑权重。

#### 计算 SSIM

SSIM 是另一种质量评估指标，它通过三个因素反映图像失真，包括亮度、对比度和结构。

##### Chen's work

为 2D 和 360 度视频分析了 SSIM 结果，引入了球型结构的相似性度量（S-SSIM）来计算原始和受损的 360 度视频之间的相似性。

- 在 S-SSIM 中，使用重投影来计算两个提取的 viewport 之间的相似性。

##### Zhou's work

考虑相似性的权重提出了 WS-SSIM 来测量投影区域中窗口的相似性。

- 性能评估表明，与其他质量评估指标相比，WS-SSIM 更接近人类感知。

##### Van der Hooft's work

提出了*ProbGaze*度量方式，基于 tile 的空间尺寸和 viewport 中的注视点。

- 考虑外围 tile 的权重来提供合适的质量测量。
- 相比于基于中心和基于平均的 PSNR 和 SSIM 度量方式，*ProbGaze*能估计当用户突然改变 viewport 位置时的视频质量变化。

##### Xu's work

引入了两种客观质量评估度量手段：基于内容感知的 PSNR 和非内容感知的 PSNR，用于编码 360 度视频。

- 第一种方式基于空间全景内容对像素失真进行加权。
- 第二种方式考虑人类偏好的统计数据来估计质量损失。

#### 基于 PSNR 和 SSIM 方式的改进

尽管各种基于 PSNR 和 SSIM 的方式被广阔地应用到了 360 度视频的质量评估中，但这些方式都没有真正地捕获到感知质量，特别是当 HMD 被用于观看视频时。因此需要为 360 度内容特别设计一种优化的质量度量方式。

##### Upenik's work

考虑了一场使用 4 张高质量 360 度全景图像来让 45 名受试者在不同的编码设定下评估和比较客观质量度量方式性能的主观实验。

- 现有的客观度量方式和主观感知到的质量相关性较低。

##### Tran's work

论证主观度量和客观度量之间相关性较高，但是使用的数据集较小。

#### 基于 ML 的方式

基于 ML 的方式可以弥补客观评估和主观评估之间的差距。

##### Da Costa Filho's work

提出了一个有两个阶段的模型。

- 首先自适应 VR 视频的播放性能由机器学习算法所确定。
- 之后模型利用估计的度量手段如视频质量、质量变化、卡顿时间和启动延迟来确定用户的 QoE。

##### Li's work

引入了基于 DRL 的质量获取模型，在一次推流会话中同时考虑头部和眼部的移动。

- 360 度视频被分割成几个补丁。
- 低观看概率的补丁被消除。
- 参考和受损视频序列都被输入到深度学习可执行文件中，以计算补丁的质量分数。
- 之后分数被加权并加到一起得到最终的分数。

##### Yang's work

考虑了多质量等级的特性和融合模型。

- 质量特性用`region of interest(ROI)`图来计算，其中包括像素点等级、区域等级、对象等级和赤道偏差。
- 混合模型由后向传播的神经网络构造而成，这个神经网络组合了多种质量特性来获取整体的质量评分。

### 总结

精确的 QoE 获取是优化 360 度视频推流服务中重要的因素，也是自适应分发方案中基础的一环。

单独考虑 VR 中的可视质量对完整的 QoE 框架而言并不足够。

为能获得学界的认可，找到其他因素的影响也很必要，例如`cybersickness`，生理症状，用户的不适感，HMD 的重量和可用性，VR 音频，viewport 降级率，网络特性（延迟，抖动，带宽等），内容特性（相机动作，帧率，编码，投影等），推流特性（viewport 偏差，播放缓冲区，时空质量变化等）。

## 低延迟推流

### 背景

360 度全景视频推流过程中的延迟由几部分组成：传感器延迟、云/边处理延迟、网络延迟、请求开销、缓冲延迟、渲染延迟和反馈延迟。

低延迟的要求对于云 VR 游戏、沉浸式临场感和视频会议等更为严格。

要求极低的终端处理延迟、快速的云/边计算和极低的网络延迟来确保对用户头部移动做出反馈。

现代 HMD 可以做到使传感器延迟降低到用户无法感知的程度。

传输延迟已经由 5G 移动和无线通信技术大幅减少。

但是，对于减少处理、缓冲和渲染延迟的工作也是必要的。

许多沉浸式应用的目标是 MTP 的延迟少于 20ms，理想情况是小于 15ms。

### 减少启动时间

#### 减少初始化请求的数据量

通常来讲，较小的视频 segment 能减少启动和下载时间。

##### Van der Hooft's work

考虑了新闻相关内容的推流，使用的技术有：

1. 服务端编码
2. 服务端的用户分析
3. 服务器推送策略
4. 客户端积极存储视频数据

取得的效果：

- 降低了启动时间
- 允许不同网络设定下的快速内容切换
- 较长的响应时间降低了性能

##### Nguyen's work

基于 viewport 依赖的自适应策略分析了自适应间隔延迟和缓冲延迟的影响。

- 使用服务端比特率计算策略来最小化响应延迟的影响。
- 根据客户端的响应估计可用的网络吞吐量和未来的 viewport 位置。
- 服务端的决策引擎推流合适的 tile 来满足延迟限制。

取得的效果：

- 对于 viewport 依赖型推流方案而言，较少的自适应和缓冲延迟不可避免。

### 降低由 tile 分块带来的网络负载

在 HTTP/1.1 中，在空间上将视频帧分成矩形 tile 会增加网络负载，因为每个 tile 会产生独立的网络请求。

请求爆炸的问题导致了较长的响应延迟，但是可以通过使用 HTTP/2 的服务器推送特性解决。这个特型使服务器能使用一条 HTTP 请求复用多条消息。

##### Wei's work

利用 HTTP/2 协议来促进低延迟的 HTTP 自适应推流。

- 提出的服务端推送的策略使用一条请求同时发送几个 segment 避免多个 GET 请求。

##### Petrangeli's work

结合特定请求参数与 HTTP/2 的服务端推送特性来促进 360 度视频推流。

- 客户端为一个 segment 发送一条 call，服务器使用 FCFS 策略传送 k 个 tile。
- 利用 HTTP/2 的优先级特性可以使高优先级的 tile 以紧急的优先级被获取，进而改善网络环境中的高往返时间的性能。

##### Xu's work

为 360 度内容采用了`k-push`策略：将 k 个 tile 推送到客户端，组成一个单独的时间段。

- 提出的方法与 QoE 感知的比特率自适应算法一起，在不同的 RTT 设定下，提高了 20%的视频质量，减少了 30%的网络传输延迟。

##### Yahia's work

使用 HTTP/2 的优先级和多路复用功能，在两个连续的 viewport 预测之间，即在交付相同片段之前和期间，组织紧急视频块的受控自适应传输。

##### Yen's work

开发了一种支持 QUIC 的体系结构来利用流优先级和多路复用的特性来实现 360 度视频的安全和低优先级的传输。

- 当 viewport 变化发生时，QUIC 能让常规的 tile 以低优先级推流，viewport 内的 tile 以高优先级推流，都通过一条 QUIC 连接来降低 viewport tile 的缺失率。
- 作者说测试表明基于 QUIC 的自适应 360 度推流比 HTTP/1.1 和 HTTP/2 的方案表现更好。

### 使用移动边缘计算降低延迟

##### Mangiante's work

提出了利用基于边缘处理的 viewport 渲染方案来减少延迟，同时利用终端设备上的电源和计算负载。

- 但是作者没有给出有效的算法或是建立一个实践执行平台。

##### Liu's work

采用远端渲染技术，通过为不受约束的 VR 系统获取高刷新率来隐藏网络延迟。

- 采用 60GHz 的无线链路支持的高端 GPU，来加快计算速度和 4K 渲染，减少显示延迟。
- 尽管提供了高质量和低延迟的推流，但是使用了昂贵的带宽连接，这通常并不能获得。

##### Viitanen's work

引入了端到端的 VR 游戏系统。通过执行边缘渲染来降低延迟，能源和计算开销。

- 为 1080p 30fps 的视频格式实现了端到端的低延迟（30ms）的系统。
- 前提是有充足的带宽资源、终端设备需要性能强劲的游戏本。

##### Shi's work

考虑了不重视 viewport 预测的高质量 360 度视频渲染。

- 提出的 MEC-VR 系统采用了一个远端服务器通过使用一个自适应裁剪过滤器来动态适应 viewport 覆盖率，这个过滤器按照观测到的系统延迟增加 viewport 之外的区域。
- 基于 viewport 覆盖率的延迟调整允许客户端容纳和补偿突然的头部移动。

### 共享 VR 环境中的延迟处理

共享 VR 环境中用户的延迟取决于用户的位置和边缘资源的分发。

##### Park's work

通过考虑多个用户和边缘服务器之间的双向通信，提出了一种使用线性蜂窝拓扑中的带宽分配策略，以最小化端到端系统延迟。确定了推流延迟强烈地依赖于：

- 边缘服务器的处理性能
- 多个交互用户之间的物理和虚拟空间

##### Perfecto's work

集成了深度神经网络和毫米波多播传输技术来降低协同 VR 环境中的延迟。

- 神经网络模型估计了用户即将来临的 viewport。
- 用户被基于预测的相关性和位置分组，以此来优化正确的 viewport 许可。
- 执行积极的多播资源调度来最小化延迟和拥塞。

### 总结

在单用户和多用户的环境中，边缘辅助的解决方式对于控制延迟而言占主要地位。

此外还有服务端的 viewport 计算、服务端 push 机制和远程渲染机制都能用于低延迟的控制。

现有的 4G 网络足以支持早期的自适应沉浸式多媒体，正在成长的 5G 网络更能满足沉浸式内容的需求。

## 360 度直播推流

### 背景

传统的广播电视频道是直播推流的流行来源。现在私人的 360 度直播视频在各个社交媒体上也有大幅增长。

因为视频生产者和消费者之间在云端的转码操作，360 度视频推流是更为延迟敏感的应用。

现有的处理设备在诸如转码、渲染等实时处理任务上受到了限制。

#### 内容分发

##### Hu's work

提出了一套基于云端的直播推流系统，叫做`MELiveOV`，它使高分辨率的全向内容的处理任务以毛细管分布的方式分发到多个支持 5G 的云端服务器。

- 端到端的直播推流系统包括内容创作模块、传输模块和 viewport 预测模块。
- 移动边缘辅助的推流设计减少了 50%的带宽需求。

##### Griwodz's work

为 360 度直播推流开发了优化 FoV 的原型，结合了 RTP 和基于 DASH 的`pull-patching`来传送两种质量等级的 360 度视频给华为 IPTV 机顶盒和 Gear VR 头戴设备。

- 作者通过在单个 H.265 硬件解码器上多路复用多个解码器来实现集体解码器的想法，以此减少切换时间。

#### 视频转码

##### Liu's work

研究表明只转码 viewport 区域有潜力大幅减少高性能转码的计算需求。

##### Baig's work

开发了快速编码方案来分发直播的 4K 视频到消费端设备。

- 采用了分层视频编码的方式来在高度动态且不可预测的 WiGig 和 WiFi 链路上分发质量可变的块。

##### Le's work

使用 RTSP 网络控制协议为 CCTV 的 360 度直播推流提出了实时转码和加密系统。

- 转码方式基于 ARIA 加密库，Intel 媒体 SDK 和 FFmpeg 库。
- 系统可以管理并行的转码操作，实现高速的转码性能。

#### 内容拼接缝合

相比于其他因素如捕获、转码、解码、渲染，内容拼接在决定整体上的推流质量时扮演至关重要的角色。

##### Chen's work

提出了一种内容驱动的拼接方式，这种方式将 360 度帧的语义信息的不同类型看作事件，以此来优化拼接时间预算。

- 基于 VR 帧中的语义信息，tile 执行器模块选择合适的 tile 设计。
- 拼接器模块然后执行基于 tile 的拼接，这样，基于可用资源，事件 tile 有更高的拼接质量。
- 评估表明系统通过实现 89.4%的时间预算，很好地适应了不同的事件和时间限制。

### 总结

相比于点播式流媒体，360 度直播推流面临多个挑战，例如在事先不知情的情况下处理用户导航、视频的首次流式传输以及实时视频的转码。在多用户场景中，这些挑战更为棘手。

关于处理多个用户的观看模式，可伸缩的多播可以用于在低带宽和高带宽网络上以接近于按需推流的质量等级。

基于 ROI 的 tile 拼接和转码可以显著地减少延迟敏感的交互型应用的延迟需求。
