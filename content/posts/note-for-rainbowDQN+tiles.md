---
title: "Note for Dante"
date: 2021-12-11T16:14:15+08:00
draft: false
math: true
keywords: ["Immersive Video",]
tags: ["Immersive Video", "DRL", "Rainbow-DQN"]
categories: ["Immersive Video"]
---

## 论文概况

Level：IEEE Transaction on multimedia 21

Keyword：Rainbow-DQN, Multi-type tiles, Full streaming system

## 系统架构

* 服务端
  1. 将原始视频转码为有不同比特率的多个版本。
  2. 转码后的视频被划分成多个tile。
  3. 传输协议使用MPEG-DASH。
* 客户端
  1. 评估器
      * 任务：获取 QoE、FOV预测、传输效率、网络带宽
      * 组成：
        * QoE评估器：评估当前FOV质量=>Q和重缓冲频率=>F（近似为Q+F=QoE）
        * FOV预测器：基于历史FOV信息预测短期未来的FOV=>P
        * 根据下载和播放日志：计算传输效率=>E并估计带宽=>B
  2. 控制器
      * 任务：控制传输过程中的推流
      * 目标：保证QoE在可接受的范围之内、最大化传输效率
      * 详细：基于FOV预测将tile划分成3种类型：FOV、OOS、Base
      * 输入：Q、F、E、B（QoE+传输效率和带宽）
      * 过程：Rainbow-DQN
      * 输出：决定每个tile流的码率和缓冲区大小（作为下载器的输入）
  3. 下载器
      * 输入：tile码率和缓冲区大小
      * 过程：基于HTTP/2进行并行下载
      * 输出：下载好的tile
  4. 视频缓冲区
      * 任务：解码、同步、存储下载好的tile等待渲染器消耗，大小供控制器调节
      * 随着FOV的切换缓冲区内容可能被循环利用
  5. 全景渲染器
      * 任务：将同步好的tile拼接，tile质量：FOV>OOS>Base
      * 投影方式：ERP

## 控制器

### 控制过程

1. 设定QoE的可接受范围。

2. 将网络带宽和用户FOV设定为外部因素而非环境
   
    为什么：因为这两个因素变化太快，在面对不同传输条件时，直接作为环境会导致决策过程的不稳定性并且难以收敛。
    
3. 最优化的对象只是最大化累积的传输效率。

    为什么：简单

### tile聚合和决策

1. tile分类原则：
    * 控制器无需为每个tile独立决定码率Q和缓冲区大小L
    
    * FOV内的tile应该被分配相近的码率，FOV内的tile应该聚集成一组，OSS和Base同理
    
      为什么：避免相邻tile的锐利边界，只考虑3组而非所有tile降低了计算复杂性和决策延迟
    
      （能否实现独立的tile码率计算或更细粒度的划分值得调研？与内容感知的方案结合？）
    
2. 基于距离的tile分类实现方式：
    * 使用评估器预测出的FOV坐标来分类FOV和OOS的tile
    
    * tile出现在未来FOV的可能性由距离计算
      
      tile中心点坐标$(\omega_i, \mu_i)$、FOV坐标$(\hat{U}, \hat{V})$  
      
      距离的变化区间内存在一个临界点，临界点之内的划分为FOV，之外的划分为OOS
      
      * 度量距离的方式：
        $$
        \Delta Dis_U = min\{|\omega_i - \hat{U}|, |1+\omega_i - \hat{U}|\}
        $$
      
        （这里为何不直接使用$|\omega_i - \hat{U}|$？）
        $$
        Dis_i = 
        \begin{cases}
        {\sqrt{{\Delta Dis_U}^2 + {(\mu_i - \hat{V})}^2},\  \frac{R}{H} \le \hat{V} \le 1 - \frac{R}{H}}  \\
        {\Delta Dis_U + |\mu_i - \hat{V}|,\ Others}
        \end{cases}
        $$
        
      * 因为ERP的投影方式会在两级需要更多的tile，因此使用一个矩形来代表两极的FOV
      
        （可以深入调研ERP在两极处的处理方式）
      
      * $Dis_i$使用曼哈顿距离来测量。临界点初始化为$2\cdot R$，并随着FOV中心和两极的垂直距离增长。
      
      * FOV看作是半径为R的圆，使用欧式距离测量。临界点初始化为$R$
    
3. 聚合tile的决策
    * 使用2个变量：$K$作为FOV和非FOV的tile的带宽分配比率；$Len$作为tile缓冲区的大小。
      * $K$确定之后，分配给FOV内tile的带宽被均匀分配（可否非均匀分配）
      
        $K$不直接与网络状况相关因此可以保持控制的稳定性
      
      * $Len$：所有传输的tile的缓冲区长度$l_i$都被设为$Len$  （文中并没有这样做的原因解释）

### 基于DRL的传输控制算法

相关术语解释：[Rainbow DQN](https://www.jianshu.com/p/1dfd84cd2e69)、[RL Dictionary](https://towardsdatascience.com/the-complete-reinforcement-learning-dictionary-e16230b7d24e)、[PER](https://zhuanlan.zhihu.com/p/38358183)、[TD-Error](https://zhuanlan.zhihu.com/p/34747205)

1. 控制过程
    1. 首先调整buffer长度Len，并划分FOV与非FOV的带宽分配。
    
    2. 等viewport预测完成之后，tile被分类为属于FOV和OOS的tile。
    
    3. FOV的带宽被平均分给其中每一个tile并决定FOV内tile的质量等级$q_i$。
    
        非FOV的带宽按照与FOV的距离分配，每超过一个距离单位$Dis_i$就降低一级质量$q_i$。
    
    4. 最终的输出是请求序列，每个请求序列中包括质量等级$q_i$和预期的缓冲区大小$l_i$。
    
    5. 根据输出做出调整之后，接收奖励反馈并不断完成自身更新。
    
2. 状态设计
   
    状态设计为4元组：$<K, Len, F, E>$，包括传输控制参数$K$，$Len$、QoE指标$F$和传输效率$E$。
    
    没有直接使用带宽$B$和viewport轨迹$V$，因为：
    
    1. 随机性强与变化幅度较大带来的不稳定性（如何定义随机性强弱和变化幅度大小？）
    2. 希望设计的模型有一定的通用性，可以与不同的网络情况和用户轨迹相兼容
    
3. 动作设计
   
    两种动作：调整$K$和$Len$（两者的连续变化区间被离散化，调整的每一步分别用$\Delta k$和$\Delta l$表示）
    
    调整的方式被形式化为二元组：$<n_1, n_2>$，$n_1$和$n_2$分别用于表示$K$和$Len$的调整
    
    |     | -n                  | 0    | n                   |
    | :---: | :-------------------: | :----: | :-------------------: |
    | K   | 减少n$\Delta k$ | 不变 | 增加n$\Delta k$ |
    | Len | 减少n$\Delta l$   | 不变 | 增加n$\Delta l$   |
    
4. 奖励函数
    因为QoE的各项指标权重难以确定，没有使用传统的基于加权的方式。
    
    设定了**能接受的QoE范围**和**在此基础上最大化的传输效率**作为最后的性能指标，形式化之后如下：
    $$
    Reward = 
    \begin{cases}
    -INF,\ F \ge F^{max}\\
    -INF,\ E \le E^{min}\\
    E,\ Others
    \end{cases}
    $$
    
    $-INF$意味着终止当前episode；动作越能使系统满足高QoE的同时高效运行，得分越高；
    
    为了最大化传输效率，使用$E$作为奖励回报。
    
    FOV质量$Q$并没有参与到奖励函数中，因为：**高Q意味着高性能，但是低Q不一定意味着低性能**，详细解释如下：
    
    * 在带宽不足的情况下，低Q可能已经是这种条件下的满足性能的最好选择。
    * 高传输效率意味着传输了更多的FOV数据，也能满足高FOV质量的目标。
    
5. 模型设计
    基于Rainbow-DQN模型：
    * 输入是5元组$<K, Len, Q, F, E>$。
    
    * 神经网络使用带有64的3隐层模型。
    
    * 为了提高鲁棒性，使用Dueling DQN的方式，将Q值$Q(s, a)$分解为状态价值$V(s)$和优势函数$A(s,a)$：
      $$
      Q(s, a) = V(s) + A(s, a)
      $$
    
      $V(s)$表示系统处于状态$s$时的性能；$A(s,a)$表示系统处于状态$s$时动作$a$带来的性能；
      
    * 为了避免价值过高估计，使用Double DQN的方式，设计了两个独立的神经网络：评估网络和目标网络。
    
      评估网络用于动作选择；目标网络是评估网络从最后一个episode的拷贝用于动作评估。
    
    * 为了缓解神经网络的不稳定性（更快收敛），使用大小为$v$的回放池来按照时间序列保存客户端的经验。
      
      因为网络带宽和FOV轨迹在短期内存在特定的规律性，回放池中有相似状态和相似采样时间的样本更加重要，出现了优先级
      
      所以使用优先经验回放PER，而优先级使用时间查分误差TD-error定义
      $$
      \delta_i = r_{i+1} + \gamma Q(s_{i+1}, arg\underset{a}{max}Q(s_{i+1}, a; \theta_i); \theta_i^{'}) - Q(s_i, a_i; \theta_i)
      $$
      
      $r_i$是奖励；$\gamma$是折扣因子
      
    * 损失函数使用均方误差定义
      $$
      J = \frac{1}{v} \sum_{i=1}^{v} \omega_i(\delta_i)^2
      $$
    
      $\omega_i$是回放缓冲中第i个样本的重要性采样权重

## 实验验证

1. 环境设定
    * 传输控制模块：基于[TensorForce](https://tensorforce.readthedocs.io/en/latest/)（配置教程：[用TensorForce快速搭建深度强化学习模型](https://zhuanlan.zhihu.com/p/60241809)）；开发工具集：[OpenAI Gym](https://gym.openai.com/)
    * 数据来源：使用全景视频播放设备收集，加入高斯噪声来产生更多数据。
    
2. 结果分析
    * 与其他DQN算法的对比——DQN、Double DQN、Dueling DQN
      * 对比训练过程中每个episode中的最大累计奖励：$MAX_{reward}$

      * 对比模型收敛所需要的最少episode：$MIN_{episode}$  
        相同的带宽和FOV轨迹
      
    * 与其他策略对比性能——高QoE和高传输效率
      * 随机控制策略：随机确定K和Len
      * 固定分配策略：固定K和Len的值
      * 只预测Viewport策略：使用LSTM做预测，不存在OSS与Base，所有带宽都用于FOV
        带宽和FOV轨迹的均值和方差相等
      
    * 与其他全景视频推流系统的对比
      * DashEntire360：使用Dash直接传送完整的360度视频，使用线性回归来估计带宽并动态调整视频比特率
      
      * 360ProbDash：在DashEntire360的基础上划分tile基于Dash传输，使用可能性模型为tile分配比特率
      
      * DRL360：使用DRL来优化多项QoE指标
        
        实现三种系统、使用随机网络带宽和FOV轨迹。
        
        使用DRL360中提出的方式测量QoE：
        $$
        V_{QoE} = \eta_1 Q - \eta_2 F - \eta_3 A
        $$
        
        $A$是平均viewport时间变化，反映FOV质量Q的变化；
        
        $\eta_1, \eta_2, \eta_3$分别是3种QoE指标的非负加权，使用4种加权方式来训练模型并对比：$<1, 1, 1>$，$<1, 0.25, 0.25>$，$<1, 4, 1>$，$<1,1,4>$
      
    * 在不同环境下的性能评估——带宽是否充足、FOV轨迹是否活跃（4种环境）
