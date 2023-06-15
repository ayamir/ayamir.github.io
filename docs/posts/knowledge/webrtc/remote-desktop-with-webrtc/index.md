# 远程桌面与WebRTC


# 关于远程桌面

远程桌面是一种将一台计算机的桌面控制权限交给网络上另一台计算机的技术，两台计算机之间建立连接之后，可以进行音视频以及控制信令的相互传输，从而实现远程控制的功能。

# 远程桌面技术的实现

基于远程桌面要完成的任务目标，其需要实现以下两个核心功能：
1. 音视频的传输，即需要让控制机收到受控机的音频跟视频。
2. 控制信令的传输，即鼠标键盘的控制信号等

目前主流的远程桌面技术主要有2种：
1. 基于[VNC(Virtual Network Computing)](https://en.wikipedia.org/wiki/Virtual_Network_Computing)的远程桌面技术
2. 基于[RDP(Remote Desktop Protocol)](https://en.wikipedia.org/wiki/Remote_Desktop_Protocol)的远程桌面技术

## VNC

VNC使用远程帧缓冲协议即(RFB, Remote FrameBuffer)来远程控制另一台计算机，将控制机的键盘和鼠标事件传输到被控制机，同时将被控制机的屏幕图像传输到控制机。

基于其技术原理，VNC有以下优点：
1. 跨平台，可以在不同的操作系统上运行，VNC技术本身也有多个客户端和服务端的实现版本，如RealVNC、TightVNC、UltraVNC等
2. 开源，VNC的源代码及其很多现代衍生品都是在GNU许可证之下发布的
3. 轻量级，VNC的客户端和服务端都是非常轻量级的程序，可以在低配置的计算机上运行

但因为VNC本身的设计时间很早，因此在2023年的今天暴露出了很多的时代局限性：

1. 因为其基于像素方块的传输原理，就算是采用部分更新传输的方式，在大量像素变化的情况下会消耗大量的带宽。特别是对于现在的高分屏，其传输的数据量会更大。
2. VNC在设计之初被用于局域网内使用，因此没有考虑太多的安全性，虽然密码并不以明文发送，但是如果从网络中嗅探出加密密钥和编码之后的密码，也可能成功破解出密码。


## RDP

RDP是[微软提出的一种专有协议](https://learn.microsoft.com/en-us/troubleshoot/windows-server/remote/understanding-remote-desktop-protocol)，采用C-S架构，最早专用于Windows系统的终端和服务器之间的远程桌面连接，之后微软也实现了[RDP的MacOS客户端](https://learn.microsoft.com/en-us/windows-server/remote/remote-desktop-services/clients/remote-desktop-mac)，现在也有很多第三方的实现版本实现了其功能的子集，为GNU/Linux做了适配如[xrdp](https://github.com/neutrinolabs/xrdp)。

