# Note for RainbowDQN and Multitype Tiles


## 论文概况

Level：IEEE Transaction on multimedia 21

Keyword：Rainbow-DQN, Multi-type tiles, Full streaming system

##  问题形式化

### 模型

1. 原始视频用网格划分成$N$块tile，每个tile都被转码成$M$个不同的质量等级$q_i$。

2. 基于传输控制模块得出的结果，播放器请求$t_i$个tile的$q_i$质量的版本并将其存储在缓冲区中，对应的缓冲区大小为$l_i$。

3. 用户Viewport的信息用$V$表示，可以确定FOV的中心。

4. 根据$V$可以将tile划分成3种类型：FOV、OOS、Base。

5. FOV中的tile被分配更高的码率；

   OOS按照与$V$的距离逐步降低质量等级$q_i$；

   Base总是使用低质量等级$q_{Base}$但使用完整的分辨率。

6. 传输的tile在同步完成之后交给渲染器渲染。

7. 播放器根据各项指标计算可以评估播放性能：

   $<V, B, Q, F, E>$：viewport信息$V$，网络带宽$B$，FOV质量$Q$，重缓冲频率$F$，传输效率$E$。

8. 传输控制模块用于确定每个tile的质量等级$q_i$和缓冲区大小$l_i$。

9. 传输控制模块优化的最终目标是获取最大的性能：
   $$
   performance = E_{max},\ QoE \in accept\ range
   $$

### 带宽评估

1. 收集每个tile的下载日志来评估带宽。

2. 使用[指数加权移动平均算法EWMA](https://zhuanlan.zhihu.com/p/32335746)使评估结果光滑，来应对网络波动。

3. 第$t$次评估结果使用$B_t$表示，用下式计算：
   $$
   B_t = \beta B_{t-1} + (1-\beta)b_t
   $$
   $b_t$是B的第$t$次测量值；$\beta$是EWMA的加权系数。

4. $t=0$时，$B_0$被初始化为0；所以在初始的$t$比较小的时候，$B_t$与理想值相比就很小。

   这种影响会随着$t$增大而减少。

5. 为了优化启动过程，对公式做出修改：
   $$
   B_t = \frac{\beta B_{t-1} + (1-\beta)b_t}{1 - \beta^t}
   $$
   $t$较小的时候，分母会放大$B_t$；$t$较大时，分母趋近于1，影响随之消失。

### FOV表示和预测

1. 3D虚拟相机用于渲染视频，处于全景视频球面上的某条轨道，其坐标可以表示为$(\theta, \phi)$，可以直接从系统中获取。

   相机始终朝向球的中心，所以用户的FOV中心坐标$(\theta^{'}, \phi^{'})$可以用$(\theta, \phi)$表示：
   $$
   \begin{cases}
   \theta^{'} = (\theta + \pi)\ mod\ 2\pi,\ 0 \le \theta \le 2\pi
   \\
   \phi^{'} = \pi - \phi,\ 0 \le \phi \le \pi
   \end{cases}
   $$

2. 2D网格中tile坐标$(u, v)$可以通过球面坐标使用ERP投影获得
   $$
   \begin{cases}
   u = \frac{\theta^{'}}{2\pi} \cdot W, 0 \le u \le W.
   \\
   v = \frac{\phi^{'}}{\pi} \cdot H, 0 \le v \le H.
   \end{cases}
   $$
   $W$和$H$分别表示使用ERP投影得到的矩形宽度和高度

3. 短期的FOV预测基于目前和历史的FOV信息。

   使用$(U_t, V_t)$表示$t$时刻的FOV中心位置；$U_{t1:t2}$和$V_{t1:t2}$分别表示从$t1$到$t2$过程中$U$和$V$的序列；
   $$
   \begin{cases}
   \hat{U}_{t+T_f} = f_U (U_{t-T_p:t}).
   \\
   \hat{V}_{t+T_f} = f_V (V_{t-T_p:t}).
   \end{cases}
   $$
   $T_p$是过去记录的滑动窗口；$T_f$是短期的预测窗口；$f_U$和$f_V$分别对应$U$和$V$方向上的映射函数；

   因为是时间序列回归模型，所以映射函数使用LSTM。

### QoE评估

QoE由3个部分组成：平均FOV质量$Q$、重缓冲频率$F$与FOV内tile的质量变化（因为平均分配所以不考虑）。

1. FOV质量$Q$

   第$t$次的FOV质量评估表示为$Q_t$：
   $$
   Q_t = \frac{\beta Q_{t-1} + (1-\beta) \frac{1}{k} \cdot \sum_{j=1}^{k} max\{q_j, q_b\}}{1 - \beta^t}
   $$
   $q_j$表示第$j$条FOV tile流的质量；$k$表示FOV内tile的数量；

   为了避免评估结果的大幅波动，使用了EWMA来光滑结果。

   当第$j$条tile流因为缓冲区不足不能成功播放时，$q_j = q_{Base}$（这表明了Base tile在提高QoE中的作用）。

2. 重缓冲频率$F$

   在基于tile的传输中，每条流都属于一个缓冲区。所以当FOV中tile的缓冲区处于饥饿状态时，重缓冲就会发生。

   重缓冲频率描述了FOV内的tile流在一段时间内的重新缓冲频率。

   第$t$次重缓冲频率的评估表示为$F_t$：
   $$
   F_t = \frac{\beta F_{t-\tau} + (1-\beta) \frac{f_t}{\tau}}{1 - \beta^{\tau}}
   $$
   $f_t$表示播放失败的次数；$\tau$表示一段时间；

### 传输效率评估

第$t$次传输效率评估表示为$E_t$，$E_t$通过传输的FOV内tile占总tile的比率来计算：
$$
E_t = \frac{\beta E_{t-1} + (1-\beta) \frac{total^{FOV}}{total^{ALL}}}{1 - \beta^t}
$$
$total^{FOV}$表示FOV内tile的数据量；$total^{ALL}$表示tile的总共数据量；

效率计算并不在传输过程中完成，因为需要获取哪些tile在FOV中的信息，效率评估滞后于播放过程。

### 问题形式化

传输控制的任务：确定所有tile流的质量等级$\chi$和缓冲区大小$\psi$。
$$
\chi = <q_1, q_2, ..., q_N>
\\
\psi = <l_1, l_2, ..., l_N>
\\
<Q, F, E> = \xi (B, V, \chi, \psi)
$$
$\chi$和$\psi$与带宽$B$和Viewport轨迹$V$一起作用于系统$\xi$，最终影响FOV质量$Q$，重缓冲频率$F$和传输效率$E$。

进一步，将目标形式化为获得每条tile流的$q_i$和$l_i$通过限制QoE满足可接受的范围、在此基础上最大化传输效率：
$$
\underset{\chi, \psi}{argmax} \sum_{t=0}^{+\infty} E_t,
$$

$$
s.t.:\ 0 \le q_i \le M,
$$

$$
0 \le l_i \le L,
$$

$$
Q^{min} \le Q_t \le M,
$$

$$
0 \le F_t \le F^{max}.
$$

$q_i$和$l_i$分别受限于质量版本数$M$和最大缓冲区大小$L$；

$Q_t$受限于最低QoE标准$Q^{min}$；

$F_t$受限于最大能忍受的重缓冲频率$F^{max}$。

## 系统架构

### 服务端

1. 将原始视频转码为有不同比特率的多个版本。
2. 转码后的视频被划分成多个tile。
3. 传输协议使用MPEG-DASH。

### 客户端

#### 评估器

* 任务：获取 QoE、FOV预测、传输效率、网络带宽
* 组成：
  * QoE评估器：评估当前FOV质量=>Q和重缓冲频率=>F（近似为Q+F=QoE）
  * FOV预测器：基于历史FOV信息预测短期未来的FOV=>P
  * 根据下载和播放日志：计算传输效率=>E并估计带宽=>B

#### 控制器

* 任务：控制传输过程中的推流
* 目标：保证QoE在可接受的范围之内、最大化传输效率
* 详细：基于FOV预测将tile划分成3种类型：FOV、OOS、Base
* 输入：Q、F、E、B（QoE+传输效率和带宽）
* 过程：Rainbow-DQN
* 输出：决定每个tile流的码率和缓冲区大小（作为下载器的输入）

#### 下载器

* 输入：tile码率和缓冲区大小
* 过程：基于HTTP/2进行并行下载
* 输出：下载好的tile

#### 视频缓冲区

* 任务：解码、同步、存储下载好的tile等待渲染器消耗，大小供控制器调节
* 随着FOV的切换缓冲区内容可能被循环利用

#### 全景渲染器

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
        {\sqrt{({\Delta Dis_{U}})^2 + {(\mu_i - \hat{V})}^2},\  \frac{R}{H} \le \hat{V} \le 1 - \frac{R}{H}}
        \\
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
   
    状态设计为5元组：$<K, Len, Q, F, E>$（传输控制参数$K$，$Len$、QoE指标：FOV质量Q和重缓冲频率$F$、传输效率$E$）
    
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
    
    设定了**能接受的QoE范围**和**在此基础上最大化的传输效率**作为最后的**性能**指标，形式化之后如下：
    $$
    Reward = 
    \begin{cases}
    -INF,\ F \ge F^{max}
    \\
    -INF,\ E \le E^{min}
    \\
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
    
    * 神经网络使用64维的3隐层模型。
    
    * 为了提高鲁棒性，神经网络的第3层使用Dueling DQN的方式，将Q值$Q(s, a)$分解为状态价值$V(s)$和优势函数$A(s,a)$：
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
    * 传输控制模块：基于[TensorForce](https://tensorforce.readthedocs.io/en/latest/)（配置教程：[用TensorForce快速搭建深度强化学习模型](https://zhuanlan.zhihu.com/p/60241809)）；
    
      开发工具集：[OpenAI Gym](https://gym.openai.com/)
    
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
        
        $A$是viewport随时间的平均变化，反映FOV质量Q的变化；
        
        $\eta_1, \eta_2, \eta_3$分别是3种QoE指标的非负加权，使用4种加权方式来训练模型并对比：
        
        $<1, 1, 1>$，$<1, 0.25, 0.25>$，$<1, 4, 1>$，$<1,1,4>$
      
    * 在不同环境下的性能评估——带宽是否充足、FOV轨迹是否活跃（4种环境）

