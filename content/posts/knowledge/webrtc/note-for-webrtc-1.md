---
title: "WebRTC 中关于视频自适应的相关设置"
date: 2022-09-15T20:48:51+08:00
draft: false
math: true
keywords: ["WebRTC"]
tags: ["WebRTC"]
categories: ["knowledge"]
---

# 概况

`WebRTC`提供了视频自适应机制，其目的主要是通过降低编码的视频的质量来减少带宽和 CPU 消耗。

视频自适应发生的情形：带宽或 CPU 资源发出信号表明自己未被充分使用或被过度使用时，进行视频自适应。过度使用则降低质量，否则提高质量。

视频自适应调整的对象：帧率与分辨率。

# 资源

`Resources`监测指标来自于系统或视频流。例如，一个资源可以监测系统温度或者视频流的带宽使用率。

资源实现了`Resource`接口：

- 当资源检测到被过度使用则调用`SetUsageState(kOveruse)`；
- 当资源不再被过度使用则调用`SetUsageState(kUnderuse)`。

对所有的视频而言，默认有两种类型的资源：

- 质量标量资源
- 编码过度使用资源

## QP 标量资源

质量标量资源监测发送视频流中编码之后的帧的量化参数（QP），确保视频流的对于当前的分辨率而言可以接受。

每一帧被编码之后，`QualityScaler`就能获得相应的 QP。

过度使用或者未被充分使用的信号在平均 QP 脱离 QP 阈值之后发出。

QP 阈值在`EncoderInfo`中的`scaling_settings`属性中设置。

需要注意的是 QP 标量只在降级偏好设置为`MAINTAIN_FRAMERATE`或`BALANCED`时启用。

## 编码使用资源

编码使用资源监测编码器需要花多长时间来编码一个视频帧，实际上这是 CPU 使用率的代理度量指标。

当平均编码使用超过了设定的阈值，就会触发过度使用的信号。

## 插入其他资源

自定义的资源可以通过`Call::AddAdaptationResource`方法插入。

# 自适应

资源发出过度使用或未充分使用的信号之后，会发送给`ResourceAdaptationProcessor`，其从`VideoStreamAdapter`中请求`Adaptation`提案。这个提案基于视频的降级偏好设置。

`ResourceAdaptationProcessor`基于获得的提案来确定是否需要执行当前的`Adaptation`。

## 降级偏好设置

有 3 种设置，在`RtpParameters`的头文件中定义：

- `MAINTAIN_FRAMERATE`: 自适应分辨率
- `MAINTAIN_RESOLUTION`: 自适应帧率
- `BALANCED`: 自适应帧率或分辨率

降级偏好设置在`RtpParameters`中的`degradation_perference`属性中设置。

# `VideoSinkWants`和视频流自适应

自适应完成之后就会通知视频流，视频流就会转换自适应为`VideoSinkWants`。

这些接收器需求向视频流表明：在其被送去编码之前需要施加一些限制。

对于自适应而言需要被设置的属性为：

- `target_pixel_count`: 对于每个视频帧要求的像素点总数，为了保持原始的长宽比，实际的像素数应该接近这个值，而不一定要精确相等，
- `max_pixel_count`: 每个视频帧中像素点的最大数量，不能被超过。
- `max_framerate_fps`: 视频的最大帧率，超过这个阈值的帧将会被丢弃。

`VideoSinkWants`可以被任何视频源应用，或者根据需要可以直接使用其基类`AdaptationVideoTraceSource`来执行自适应。
