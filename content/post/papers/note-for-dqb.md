---
title: "Note for DQB"
date: 2022-03-20T22:09:11+08:00
draft: false
math: true
keywords: ["QoE"]
tags: ["QoE"]
categories: ["paper"]
url: "posts/papers/note-for-dqb"
---

# 整体概况

Link：[Modeling the Perceptual Quality for Viewport-Adaptive Omnidirectional Video Streaming Considering Dynamic Quality Boundary Artifact](https://ieeexplore.ieee.org/document/9317771)
Level：IEEE TCSVT 2021

DQB: Dynamic Quality Boundary，指在基于分块的 FoV 自适应全景视频推流过程中低质量分块区域的暴露和质量切换现象。

DQB 现象实际上就是 FoV 内分块间的质量差异和随时间变化的分块质量变化。
这篇论文主要的贡献在于深入研究了这种现象，并且针对此提出了可以利用现存的 QoE 评估指标的模型，并且可以实际应用。

# Model 的建立

1. 执行一系列主观评估，由低质量分块的比例和质量导致的感知质量的降低可以基于主观实验结果完成建模。
2. 结合剩下分块的感知质量可以完成单帧质量模型的建模。
3. 最后将一段时间内的所有帧的感知质量池化，就完成了整个的模型。

## 主观实验的设定

1. 获得 FoV 内帧的感知质量（低质量分块和高质量分块同时存在）
2. 获取整个视频的感知质量（与上面的实验过程相近，只是过程中没有暂停）
3. 获取整个视频的感知质量（没有引入 DQB，所有分块质量相同）

实验结果

![quality-with-different-proportion-low-quality](https://raw.githubusercontent.com/ayamir/blog-imgs/main/quality-with-different-proportion-low-quality.png)

## 帧质量感知模型

从上面的实验结果可以看出来高质量区域与低质量区域的质量差距 $d_n$ 越大，DQB 效应越显著（符合直觉）。将这部分影响因素看作是感知质量的主要影响因素：

$$
d_n = Q_{H, n} - Q_{L, n}
$$

$Q_{H, n}$ 和 $Q_{L, n}$ 分别表示第 $n$个 帧高质量分块和低质量分块的感知质量。
这两个质量从主观实验 3 的主观质量获得，在之后的训练过程中可以被客观质量评估的结果所替换。

为了调查质量差异 $d_n$ 和感知质量降低 $D_n$ 之间的关系，通过使用实验 1 的帧质量分数计算得出第$n$个帧的感知质量降低：

$$
D_n = Q_{H, n} - Q_{HL, n}
$$

$Q_{HL, n}$是实验 1 中评分得到的第$n$个帧的 FoV 内感知质量。

在 6 个视频上的实验结果如下图：

![relationship-with-Dn-and-dn](https://raw.githubusercontent.com/ayamir/blog-imgs/main/relationship-with-Dn-and-dn.png)

可以看到二者的关系可以近似为线性相关，即：

$$
D_n = k_1 d_n
$$

$k_1$ 作为线性回归的参数，可以计算出来。

但是对于不同取值的 $p_n$ ， $k_1$ 的取值也相当不同，两者之间的关系可以见下图：

![relationship-with-pn-and-k1](https://raw.githubusercontent.com/ayamir/blog-imgs/main/relationship-with-pn-and-k1.png)

数学表示可以建模为：

$$
k_1 = a_1 \cdot ln(a_2 \cdot p_n + a_3) \cdot sgn(p_n - P)
$$

$sgn$ 是符号函数，$a_1, a_2, a_3$ 可以从回归中计算出来， $P$ 表示低质量分块的比例。按照图中的回归结果，$P = 0.118$ 时，用户几乎没办法注意到低质量区域的存在。

最终，由低质量区域暴露引起的感知质量降低 $D_n$ 可以计算为：

$$
D_n = a_1 \cdot ln(a_2 \cdot p_n + a_3) \cdot (Q_{H, n} - Q_{L, n}) \cdot sgn(p_n - P)
$$

那么实际的感知质量 $Q_n$ 可以计算为：

$$
Q_n = Q_{H, n} - D_n
$$

## 时间池化

可以采用下面两种方式之一完成

### [`Exp Minkowski-Based`](https://ieeexplore.ieee.org/document/6603210)

单个帧的感知质量由衰减指数加权，衰减指数表示在主观评估中观察到的[近因效应](https://www.spiedigitallibrary.org/conference-proceedings-of-spie/3299/1/Viewer-response-to-time-varying-video-quality/10.1117/12.320109.short?SSO=1)。

最终整个视频的感知质量 $PQ$ 可以计算为：

$$
PQ = \Big[\frac{1}{N} \sum_{n=1}^{N} exp\big( \frac{n-N}{\delta} \big) \cdot {Q_n}^p \Big]^{1/p}
$$

$N$ 是整个视频的帧数。

$p$ 是 `Minkowski`指数，高 $p$ 值强调了最高质量帧的影响。

$\delta$ 是控制近因效应强度的指数时间常数，以帧的数量的形式给出，高 $\delta$ 值对应较弱的近因效应。

$p$ 和 $\delta$ 的值可以通过对主观帧质量和视频序列的整体质量进行回归得到。

### [`Quality Contribution-Based`](https://ieeexplore.ieee.org/document/6235989)

之前的研究表明，传统视频在时间维度上的感知质量降低主要与每帧的显示时长相关。

FoV 自适应的全景视频也与之类似，感知质量与降低质量帧和高质量帧的持续时间相关。因此采用`Quality Contribution`的概念来描述每帧对视频感知质量的影响（考虑每帧的空间感知质量和显示时长）。

时间池化是由相应的显示时长加权的每帧的质量贡献的函数，特别的，质量贡献是从 MOS 和显示持续时间之间初步找到的对数关系所导出的：

$$
C_n = Q_n \cdot (p_1 + p_2 \cdot log(T))
$$

$C_n$ 是第 $n$ 帧的贡献， $T$ 是每帧的显示时长， $T = Max(T, 33.3ms)$，即当帧率不低于 30fps 时，时间不连续性可以忽略。

接着，二级时间池化法用于池化单帧的分布。这种方法将 FoV 内的帧以注视水平划分为短时帧组(GoFs)，并以 GoF 的质量作为长期时间池化的基本单位来评估感知质量。

给出每帧的质量贡献之后，每个 GoF 的质量可以计算为

$$
Q_{GoF} = \frac{\sum_{n \in N} \big( C(n) \cdot T(n) \big)}{\sum_{n \in N} T(n)}
$$

接下来组合 GoF 的质量得到长期时间池化，即可以获得感知质量。

质量严重受损的帧会影响相邻帧的感知质量，视频中质量最差的部分主要决定整个视频的感知质量。因此提出选择计算出的质量低于平均值 75%的 GoF，以此计算平均质量并作为整个视频的感知质量。
