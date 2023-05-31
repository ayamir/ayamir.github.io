---
title: "Note for Survey on Bitrate Adaptation Schemes for Streaming Media Over HTTP (2)"
date: 2022-02-27T10:39:45+08:00
draft: false
math: true
keywords: ["ABR"]
tags: ["ABR", "Survey"]
categories: ["paper"]
url: "posts/papers/note-for-survey-on-bitrate-adaptation-schemes-for-streaming-media-over-http-2"
---

# Bitrate Adaptation Schemes

## Client-based

Recently, most of the proposed bitrate adaptation schemes reside at the client side, according to the specifications in the DASH standard.

![image-20220227104659348](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20220227104659348.png)

Purposes:

1. Minimal rebuffering events when the playback buffer depletes.
2. Minimal startup delay especially in case of live video streaming.
3. A high overall playback bitrate level with respect to network resources.
4. Minimal video quality oscillations, which occur due to frequent switching.

### Available bandwidth-based

The client makes its representation decisions based on the measured available network bandwidth, which is usually calculated as the size of the fetched segment(s) divided by the transfer time.

This scheme suffers from poor QoE due to a lack of a reliable bandwidth estimation methods, which results in frequent buffer underruns.

#### General context

- [Based on segment fetch time(SFT)](https://dl.acm.org/doi/10.1145/1943552.1943575) measures the time starting from sending the HTTP GET request to receiving the last byte of the segment. Sequential and parallel segment fetching method in CDNs, by using metric that compares the expected segment fetch time(ESFT) with the measured SFT to determine if the selected segment bitrate matches the network capacity.

  [Based on the bitrate observed for the last segment downloaded](https://ieeexplore.ieee.org/document/6333880/) and the estimated throughput that was calculated during the previous estimation.

- [Probe AND Adapt](https://ieeexplore.ieee.org/document/6774592) tries to eliminate the ON-OFF steady state issue as well as reduce bitrate oscillations when multiple clients share the same bottleneck link.

- [piStream](https://dl.acm.org/doi/10.1145/2789168.2790118) enables clients to estimate bandwidth based on a resource monitor module that act as a physical-layer daemon.

- [SVC with DASH](https://dl.acm.org/doi/10.1145/2155555.2155580) prefetches base layers of future segments or downloads enhancement layers for existing segments using a bandwidth-sloping-based heuristic.

#### Mobile context

##### Static

- [DASH2M](https://dl.acm.org/doi/10.1145/2964284.2964313) uses HTTP/2 server push and stream terminate properties to reduce the battery consumption of the mobile device. Adaptive k-push scheme propose to increase/decrease k according to a bandwidth increase/decrease while keeping in mind the overall power consumption in a push cycle.
- [LOw-LatenceY Prediction-based adaPtation(LOLYPOP)](https://dl.acm.org/doi/10.1145/2990505) leverages TCP throughput predictions on multiple times scales to achieve low latency and improve QoE.

##### Motive

- [GeoStream](https://dl.acm.org/doi/10.1145/2964284.2964333): introduce the use of geostatistics to estimate future bandwidth in unknown locations.

### Playback Buffer-Based

The client uses the playout buffer occupancy as a criterion to select the next segment bitrate during video playback.

This scheme suffers from many limitations including low overall QoE and instability issues, especially in the case of long-term bandwidth fluctuations. SVC-based approaches have limitations related to the complexity of SVC.

- [Base](https://ieeexplore.ieee.org/document/7177435) combines the buffer size with a tool-set of client metrics for accurate rate selection and smooth switching.
- [BBA](https://dl.acm.org/doi/10.1145/2619239.2626296) aims to maximize the average video quality and avoid unnecessary rebuffering events, but suffers from QoE degradation during long-term bandwidth fluctuations.
- [BOLA](https://ieeexplore.ieee.org/document/7524428) uses online control algorithm that treats bitrate adaptation as a utility maximization problem. Provide strong theorectical proof that it is near optimal, design a QoE model that incorporates both the average playback quality and the rebuffering time. It is implemented and available in the `dash.js` player.
- [BIEB](https://ieeexplore.ieee.org/document/6573184) maximizes video quality based on SVC priority while reducing the number of quality oscillations and avoiding stalls and frequent bitrate switching. it maintains a stable buffer occupancy before increasing the quality.
- [QUEuing Theory approach to DASH Rate Adaptation(QUETRA)](https://dl.acm.org/doi/10.1145/3123266.3123390) allows to calculate the expected buffer occupancy given a bitrate choice, network throughput, and buffer capacity.

### Mixed Adaptation

The client makes its bitrate selection based on a combination of metrics including available bandwidth, buffer occupancy, segment size and/or duration.

#### Simple client

- Control-theoretic based: [FastMPC](https://dl.acm.org/doi/10.1145/2829988.2787486), [Another](https://ieeexplore.ieee.org/document/6410740)
- Optimization problem: [Streaming video over HTTP with Consistent Quality](https://dl.acm.org/doi/10.1145/2557642.2557658)
- [Towards agile and smooth video adaptation in dynamic HTTP streaming](https://dl.acm.org/doi/10.1145/2413176.2413190) aims to balance bandwidth utilization and smoothness in DASH in both single and multiple CDN(s) scenarois.
- [SQUAD](https://dl.acm.org/doi/10.1145/2910017.2910593) is a lightweight bitrate adaptation algorithm that uses the available bandwidth and buffer information to increase the average bitrate while minimizing the number of quality switches.
- [Multi-path solution for abr in wireless networks](https://dl.acm.org/doi/10.1145/2155555.2155582) avoids the problems of TCP congestion control by using parallel TCP streams.
- [SARA](https://ieeexplore.ieee.org/document/7247436) is Segment-Aware Rate Adaptation algorithm based on the segment size variation, the available bandwidth estimate and the buffer occupancy. It extends MPD file to include the size of every segment.
- [ABMA+](https://dl.acm.org/doi/10.1145/2910017.2910596) selects the highest segment representation based on the estimated _probability of video rebuffering_. It makes use of buffer maps, which define the playout buffer capacity that is required under certain conditions to satisfy a rebuffering threshold and to avoid heavy online calculations.
- [GTA](https://dl.acm.org/doi/10.1145/3204949.3204961) uses a cooperative game in coalition formation then formulates the bitrate selection problem as a bargaining process and consensus mechanism. GTA improves QoE and video stability without increasing the stall rate or startup delay.

#### Multiple clients

- [ELASTIC](https://ieeexplore.ieee.org/document/6691442) generates a long-lived TCP flow and avoids the ON-OFF steady state behavior which leads to bandwidth overestimations. Ensure bandwidth fairness between competing clients based on network feedback assistance, but without taking the QoE into consideration. In addition, it ignores quality oscillations in its bitrate decisions.
- [Adaptation algorithm for HAS](https://ieeexplore.ieee.org/document/6229732) uses current buffer occupancy level to estimate available bandwidth and average bitrate of the different bitarte levels from MPD as metrics in its bitrate selection.
- [FESTIVE](https://ieeexplore.ieee.org/document/6704839) contains:
  - a bandwidth estimator module
  - a bitrate selection and update method with stateful player
  - a randomized scheduler which incorporates the buffer size to schedule the download of the next segment.
- [TSDASH](https://ieeexplore.ieee.org/document/8101529) uses a logarithmic-increase-multiplicative-decrease (LIMD) based bandwidth probing algorithm to estimate the available bandwidth and a dual-threshold buffer for the bitrate adaptation.

### MDP-Based

The video streaming process is formulated as a finite MDP to be able to make adaptation decisions under fluctuating network conditions.

This scheme may suffer from instability, unfairness and underutilization when the number of clients increases, probably because such factors are not taken into account in the MDP models and due to clients' decentralized ON-OFF patterns.

- [Real-time best-action search algorithm over multiple access networks](https://ieeexplore.ieee.org/document/6774598) uses both Bluetooth and WiFi links to simultaneously download video segments. However, this scheme shows limitations during user mobility which negatively affect QoE.
- [Optimizing in Vehicular environment](https://ieeexplore.ieee.org/document/7305810) introduces a three-variant of RL-based algorithms which take advantage of the historical bandwidth samples to build an accurate bandwidth estimation model.
- [Multi-agent Q-Learning-based for fairness](https://ieeexplore.ieee.org/document/6838245) uses a central manager in charge of collecting QoE statistics and coordination between the competing clients. The algorithm ensures a fair QoE distribution and improves QoE while avoiding suboptimal decisions.(without considering stalls and quality switches)
- [Online learning adaptation](https://dl.acm.org/doi/10.1145/2910017.2910603) aims to select the optimal representation and maximize the long-term expected QoE. The reward function is calculated from a combination of quality oscillations, segment quality and stalls experienced by the client. It exploits a parallel learning technique to avoid slow convergence and suboptimal solutions.
- [mDASH](https://ieeexplore.ieee.org/document/7393865) aims to improve QoE during long-term bandwidth variations. It takes buffer size, bandwidth conditions and bitrate stability as Markov state variables.
- [Pensive](https://dl.acm.org/doi/10.1145/3098822.3098843) does not rely on pre-programmed models or assumptions about the environment, but gradually learns the best policy for bitrate decisions through observation and experience.
- [D-DASH](https://ieeexplore.ieee.org/document/8048013) combines DL and RL to improve QoE, achieves a good trade-off between policy optimality and convergence speed during the decision process.

## Server-Based

Server-based schemes use a bitrate shaping method at the server side and do not require any cooperation from the client. The switching between the bitrates is implicitly controlled by the bitrate shaper. The client still makes its own decisions, but the decisions are more or less determined by the shaping method on the server.

- [Traffic shaping](https://dl.acm.org/doi/10.1145/2155555.2155557) analyzes instability and unfairness issues in the presence of multiple HAS players competing for the available bandwidth. This method can be deployed at a home gateway to improve fairness, stability and convergence delay, and to eliminate the OFF periods during the steady states.
- [Tracker-assisted adaptation](https://ieeexplore.ieee.org/document/7524620) uses a architecture which consists of clients communicating with a server through a shared proxy and a server having a tracker functionality that manages the clients' statuses and helps them share knowledge about their statues.
- [Quality Adaptation Controller](https://dl.acm.org/doi/10.1145/1943552.1943573) aims to control the size of the server sending buffer in order to adjust and select the most appropriate bitrate level for each DASH player. It maintains the playback buffer occupancy of each player as stable as possible and to match bitrate level decisions with the available bandwidth.
- [Multi-Source Stream system](https://ieeexplore.ieee.org/document/7983147/): the client fetches the segments from multi-source stream servers.

![image-20220227213700459](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20220227213700459.png)

Cons:

1. Produce high overhead on the server side with a high complexity
2. These schemes also need modifications to the MPD or a custom server software to implement the bitrate adaptation logic.(a violation of the DASH-standard design principles)
