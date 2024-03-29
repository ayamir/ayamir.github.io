---
title: "远程桌面与WebRTC"
date: 2023-06-15T18:21:02+08:00
draft: false
math: true
keywords: ["WebRTC"]
tags: ["WebRTC"]
categories: ["knowledge"]
url: "posts/knowledge/webrtc/remote-desktop-with-webrtc"
---

# 关于远程桌面

远程桌面是一种将一台计算机的桌面控制权限交给网络上另一台计算机的技术，两台计算机之间建立连接之后，可以进行音视频以及控制信令的相互传输，从而实现远程控制的功能。

# 远程桌面技术的实现

基于远程桌面要完成的任务目标，其需要实现以下两个核心功能：
1. 音视频的传输，即需要让控制机收到受控机的音频跟视频。
2. 控制信令的传输，即鼠标键盘的控制信号等

目前主流的远程桌面技术主要有 2 种：
1. 基于[VNC(Virtual Network Computing)](https://en.wikipedia.org/wiki/Virtual_Network_Computing)的远程桌面技术
2. 基于[RDP(Remote Desktop Protocol)](https://en.wikipedia.org/wiki/Remote_Desktop_Protocol)的远程桌面技术

## VNC

VNC 使用远程帧缓冲协议即(RFB, Remote FrameBuffer)来远程控制另一台计算机，将控制机的键盘和鼠标事件传输到被控制机，同时将被控制机的屏幕图像传输到控制机。

基于其技术原理，VNC 有以下优点：
1. 跨平台，可以在不同的操作系统上运行，VNC 技术本身也有多个客户端和服务端的实现版本，如 RealVNC、TightVNC、UltraVNC 等
2. 开源，VNC 的源代码及其很多现代衍生品都是在 GNU 许可证之下发布的
3. 轻量级，VNC 的客户端和服务端都是非常轻量级的程序，可以在低配置的计算机上运行

但因为 VNC 本身的设计时间很早，因此在 2023 年的今天暴露出了很多的时代局限性：

1. 因为其基于像素方块的传输原理，就算是采用部分更新传输的方式，在大量像素变化的情况下会消耗大量的带宽。特别是对于现在的高分屏，其传输的数据量会更大。
2. VNC 在设计之初被用于局域网内使用，因此没有考虑太多的安全性，虽然密码并不以明文发送，但是如果从网络中嗅探出加密密钥和编码之后的密码，也可能成功破解出密码。


## RDP

RDP 是[微软提出的一种专有协议](https://learn.microsoft.com/en-us/troubleshoot/windows-server/remote/understanding-remote-desktop-protocol)，扩展了 T-120 系列协议标准，最早专用于 Windows 系统的终端和服务器之间的远程桌面连接，之后微软也实现了[RDP 的 MacOS 客户端](https://learn.microsoft.com/en-us/windows-server/remote/remote-desktop-services/clients/remote-desktop-mac)，现在也有很多第三方的实现版本实现了其功能的子集，为 GNU/Linux 做了适配如[xrdp](https://github.com/neutrinolabs/xrdp)。因此，可以说 RDP 也一定程度上具有跨平台的性质。

相比于 VNC，RDP 的实现原理还是比较复杂的：

![rdp协议或标准](https://raw.githubusercontent.com/ayamir/blog-imgs/main/131.png)

首先，RDP 的最底层是 TCP，TCP 之上是各层的协议和服务。

+ TPKT：是 TCP 之上的 ISO 传输服务，允许两个组交换 TPDU（传输协议数据单元）或 PDU（协议数据单元）的信息单元。
+ X.224：连接传输协议，主要用于 RDP 初始连接请求和响应。
+ T.125 MCS：多点通信服务，允许 RDP 通过多个通道进行通信和管理。

RDP 的工作原理是通过 TPKT 实现信息单元的交换，通过 X.224 建立连接，使用 T.125 MCS 打开两个通道来完成两个设备之间的来回数据传输。

RDP 的特点功能比较丰富，比如：

+ 支持共享剪切板。
+ 支持多个显示器。
+ 支持虚拟化 GPU。
+ 支持 32 位彩色和 64000 个独立的数据传输通道。
+ 通过 RC4 对称加密算法使用 128 位密钥对数据进行加密。
+ 可以在使用远程计算机时参考本地计算机上的文件系统。
+ 远程计算机的应用程序可以在本地计算机上运行。

当然，事物都有两面性，RDP 拥有这么多强大功能，也有一些难以避免的缺点：

+ 网络速度较慢时，远程连接容易出现延迟。
+ 两台计算机在不同的网络上时，其配置过程相当复杂。
+ 固定使用 3389 端口监听，可能成为攻击的目标。
+ RDP 整体上还是受到微软控制，定制性比较差。

# WebRTC 和远程桌面

远程桌面的核心需求和 WebRTC 的核心功能完美契合。

+ WebRTC 基于 ICE/STUN/TURN 的 NAT 穿透方案可以很方便地解决不同网络情况下主机连接的问题，
+ WebRTC 基于 SRTP 的传输方式天然提供了实时特征、端到端的加密的数据传输服务。
+ WebRTC 针对各种网络情况做了音视频传输的大量优化，可以保证各种网络条件下的可用性。
+ WebRTC 本身其实是 Chromium 浏览器的一部分，天然具备跨平台的性质。
+ WebRTC 完全开源，定制性极强，不少公司都基于 WebRTC 来做自家的直播、云游戏业务。

整体上来讲，WebRTC 的优势使其很适合用于远程桌面业务，当然，目前市面上已经有 App 基于 WebRTC 实现了远程桌面的功能，比如[Chrome Remote Desktop](https://en.wikipedia.org/wiki/Chrome_Remote_Desktop)和[ToDesk](https://www.todesk.com/)。前者可以理解为是 Google 用自己 WebRTC 推出的远程桌面服务，体验了一下，整体上功能比较少，但是连接比较稳定，不过受 GFW 影响，这玩意在国内应该是处于没法用的状态；后者则是国产远程桌面软件，目前已经比较成熟，提供了企业版、个人版、专业版和游戏版四个版本，从其官网上提供的信息来看，应该是做出了一定成绩。

从技术上讲，基于 WebRTC 开发远程桌面应用相当合理，开源可控，还有谷歌背书，WebRTC 本身在不停地与时俱进，作为上层应用开发的远程桌面也可以及时享受到 WebRTC 带来的改进。

从业务上讲，WebRTC 本身具有的功能可以解决上面所说的 VNC 和 RDP 的诸多问题，不过就功能的丰富性而言，可能跟微软的 RDP 还差一些，但是 WebRTC 基于音视频的解决方案本身可以优化的上限还是挺高的，毕竟随着人们需求的上升，高分辨率、高帧率也会成为未来远程桌面应用必不可少的功能需求。

本篇博客从非技术层面探讨了远程桌面技术的当下两大主流技术，以及 WebRTC 应用于远程桌面业务下的可行性。下篇博客将从技术层面详细分析 WebRTC 与远程桌面业务的契合程度及可能的解决方案，就先从核心功能开始吧！
