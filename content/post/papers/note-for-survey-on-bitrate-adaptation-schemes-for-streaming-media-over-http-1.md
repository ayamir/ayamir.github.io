---
title: "Note for Survey on Bitrate Adaptation Schemes for Streaming Media Over HTTP (1)"
date: 2022-02-26T11:26:06+08:00
draft: false
math: true
keywords: ["ABR"]
tags: ["Immersive Video"]
categories: ["paper"]
url: "posts/papers/note-for-survey-on-bitrate-adaptation-schemes-for-streaming-media-over-http-1"
---

# Paper Overview

Link: https://ieeexplore.ieee.org/document/8424813

Level: IEEE Communications Surveys & Tutorials 2019

<!--more-->

# Background

## Traditional non-HAS IP-based streaming

1. The client receives media that is typically _pushed_ by a media server using **connection-oriented** protocol such as Real-time Messaging Protocol(RTMP/TCP) or **connectionless** protocol such as Real-time Transport Protocol(RTP/UDP).
2. Real-time Streaming Protocol(RTSP) is a common protocol to control the media servers, which is responsible for setting up a streaming session and keeping the state information during this session, but is not responsible for actual media delivery(task for protocol like RTP).
3. The media server performs rate adaption and data delivery scheduling based on the RTP Control Protocol(RTCP) reports sent by the client.

4. When it comes to NAT and firewall, additional protocols or configurations are needed during the session establishment.

The characteristics result in complex and expensive servers. These scalability and vendor dependency issues as well as high maintenance costs have resulted in deployment challenges for protocols like RTSP.

## HAS

Around 2005, HTTP adaptive streaming(HAS) became popular and dominant, which treated the media content like regular Web content and delivered it in small pieces over HTTP protocol.

1. HTTP as application and TCP as the transport-layer protocol.
2. Client _pull_ the data from a standard HTTP server, which simply hosts the media content.
3. HAS solutions employ dynamic adaptation with respect to varying network conditions to provide a seamless streaming experience.
4. The original file/stream is partitioned into _segments_ (also called _chunks_) of equi-length playback time. Multiple versions(also called representations) of each segment are generated that vary in bitrate/resolution/quality using an encoder or a transcoder.
5. The server generates an index file, which is a manifest that lists the available representations including HTTP urls to identify the segments along with their availability times.
6. The client first receives the manifest that contains the metadata for video, audio, subtitles and other features, then constantly measures certain parameters: available network bandwidth, buffer status, battery and CPU levels, etc. According to these parameters, the HAS client repeatedly fetches the most suitable next segment among the available representations from the server.

Advantages:

1. It use HTTP to deliver video segments, which simplifies the traversal through NATs and firewalls.
2. At the server side, it use conventional Web servers or caches available within the networks of ISPs and CDNs.
3. At the client side, it requests and fetches each segment independently from others and maintains the playback session state, whereas the server is not required to maintain any state.
4. It doesn't require a persistent connection between the client and server, which improves system scalability and reduces implementation and deployment costs.

## Comparison Summary

![image-20220226174951113](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20220226174951113.png)

![image-20220226175009202](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20220226175009202.png)

# Challenges

## Multi-Client Competition/Stability Issues

A centralized management controller can enhance the overall video quality, while improve QoE.

A robust HAS scheme should achieve 3 main objectives:

1. _Stability_: HAS clients should avoid frequent bitrate switching.
2. _Fairness_: Multiple HAS clients competing for available bandwidth should equally share network resources based on viewer, content and device characteristics.
3. _High Utilization_: While the clients attempt to be stable and fair, network resources should be used as efficiently as possible.

A streaming session consists of 2 states: buffer-filling state and steady state.

- The buffer-filling state aims to fill the playback buffer and reach a certain threshold where the playback can be initiated or resumed.

- The steady state is to keep the buffer level above a minimum threshold despite bandwidth fluctuation or interruptions. The steady state consists of 2 activity periods referred to as ON and OFF.

  The client requests a segment every $T_s$ time units, where $T_s$ represents the content time duration of each segment, and sum of ON and OFF period durations equals $T_s$.

  - ON period: client downloads the current segment and notes the achieved throughput value that will be later used in selecting the appropriate bitrate for future segments.
  - OFF period: client becomes idle temporarily.

![image-20220226213824241](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20220226213824241.png)

There are different cases during competition process.

1. The ON periods of clients don't overlap during the current segment download, each client will overestimate the available bandwidth. So longer download time will cause the initially non-overlapping ON periods to eventually start overlapping.

   ![image-20220226215611735](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20220226215611735.png)

2. As the amount of overlap increases, the clients will have lower bandwidth estimations and start selecting segments that have lower bitrate. These segment will take less time to download, causing the amount of overlap among the ON periods to precedurally shorten, until the process reverts to its initial situation.

   ![image-20220226215623739](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20220226215623739.png)

3. The cycle repeats itself, causing periodic up and down shift in the selected bitrates, leading to unstable video quality, unfairness, and underutilization.

   ![image-20220226215634221](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20220226215634221.png)

## Consistent-Quality Streaming

The correlation between video bitrate and its perceptual quality is non-linear.

- Different video content types have unique characteristics.
- Differences of inter-stream and intra-stream video scene complexity across content.

![image-20220226232232112](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20220226232232112.png)

![image-20220226232657727](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20220226232657727.png)

## QoE Optimization and Measurement

HAS scheme uses application control loop, which also interacts with a lower-layer control loop(such as TCP congestion control). It plays a key role in determining the viewer QoE.

![image-20220226233020610](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20220226233020610.png)

Factors influencing QoE are categorized as:

1. Perceptual, directly perceived by the viewer.
2. Technical, indirectly affecting the QoE.

### Perceptual

Perceptual factors include the video image quality, initial delay, stalling duration and frequency.

The impact of these factors differs depending on the users subjectivity.

Most users consider initial delays less critical than stalling.

### Technical

Technical factors include the algorithms, parameters, and hardware/software used in streaming system.

Specifically, factors are:

- Server side: encoding parameters, video qualities and segment size.
- Client side: adaptation parameters and environment that clients reside in.

### QoE measurement

1. Objective matrics: Peak Signal-to-Noise Ratio(PSNR), Structural SIMilarity(SSIM and SSIMplus), Perceived Video Quality(PVQ) and Statistically Indifferent Quality Variation(SIQV).
2. Subjective matrics: Mean Opinion Score(MOS).
3. Quality-of-Service (QoS)-derived matrics: startup delay, average video bitrate, quality switches and rebuffering events.

Try to optimize each metric is difficult because it may result in conflicts.

## Inter-Destination Multimedia Synchronization

Online communities are drifting towards watching online videos together in a synchronized manner.

Having Multiple streaming clients distributed in different geographical locations poses challenges in delivering video content simultaneously, while keeping the playback state of each client the same.

Typically, IDMS solutions involve a master node to which clients synchronize their playout to.

Rainer et proposed an IDMS architecture for DASH by using a distribute control scheme where peers can communicate and negotiate a reference placback timestamp in each session.

In another work, Rainer et provided a crowdsourced subjective evaluation to find a asynchronism threshold at which QoE was not significantly affected.
