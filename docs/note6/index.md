# 沉浸式流媒体现有标准


## OMAF(Omnidirectional Media Format)

`OMAF`是第 1 个国际化的沉浸式媒体格式，描述了对 360 度视频进行编码、演示、消费的方法。

`OMAF`与与现有格式兼容，包括编码（例如`HEVC`），文件格式（例如`ISOBMFF`），交付信号（例如`DASH`，`MMT`）。

`OMAF`中还包括编码、投影、分包和 viewport 方向的元数据。

## OMAF+DASH->MPD

OMAF 与 DASH 相结合，再加上一些额外的描述构成了 MPD 文件格式，用于向客户端通知 360 度媒体的属性。

OMAF 规定了 9 中媒体配置文件，包括 3 种视频配置文件：基于 HEVC 的 viewport 独立型、基于 HEVC 的 viewport 依赖型、基于 AVC 的 viewport 依赖型。

OMAF 为视角独立型的推流提供了无视 viewport 位置的连续的视频帧质量。

常规的 HEVC 编码方式和 DASH 推流格式可以用于 viewport 独立型的推流工作。

但是使用 HEVC/AVC 编码方式的基于 viewport 的自适应操作是 OMAF 的一项技术开发，允许无限制地使用矩形 RWP 来增强 viewport 区域的质量。

## CMAF(Common Media Application Format)

致力于提供跨多个应用和设备之间的统一的编码格式和媒体配置文件。

CMAF 使请求低延迟的 segment 成为可能。

## ISOBMFF(ISO Base Media File Format)

ISOBMFF 是用于定时数据交换、管理和显示的最流行的文件格式。

+ 文件由一系列兼容并且可扩展的文件级别的 box 组成。
+ 每个 box 表示 1 个由 4 个指针字符代码组成的数据结构。
+ ISOBMFF 的媒体数据流和元数据流被分别分发。

	- 媒体数据流中包括编码过的音频和视频数据。
	- 元数据流中包括媒体类型、编码属性、时间戳、大小等元数据，也包括全向内容的额外信息如投影格式、旋转、帧分包、编码和分发等元数据。
+ ISOBMFF 为了访问方便，保证有价值信息能灵活聚合。

## 3DoF(3 Degree of Freedom)

在 3DoF 场景中，用户可以自由的移动头部以三个方向：摆动、俯仰、旋转。

## 3DoF+

用户的头部可以以任意方向移动：上下、左右、前后

## 6DoF

不只用户的头部，用户的身体也是自由的。同时支持方向与位置的自由。


