# 使用 WebXR 完成基于分块的全景视频自适应码率播放器


最近几天一直在用`WebXR`的技术重构目前的基于分块的全景视频自适应码率播放客户端，下面简述一下过程。

首先结论是：分块播放+自适应码率+完全的沉浸式场景体验=Impossible（直接使用 WebXR 提供的 API）

## 分块播放

分块播放的本质是将一整块的全景视频从空间上划分成多个小块，各个小块在时间上与原视频的长度是相同的。

在实际播放的时候需要将各个小块按照原有的空间顺序排列好之后播放，为了避免各个分块播放进度不同的问题，播放时还需要经过统一的时间同步。

对应到 web 端的技术实现就是：

一个分块的视频<->一个`<video>`h5 元素<->一个`<canvas>`h5 元素

视频的播放过程就是各个分块对应的`<canvas>`元素不断重新渲染的过程

各个分块时间同步的实现需要一个基准视频进行对齐，大体上的原理如下：

```javascript
let baseVideo = null;
let videos = [];

initBaseVideo();
initVideos();

for (video in videos) {
  video.currentTime = baseVideo.currentTime;
}
```

## 自适应码率

自适应码率的方案使用`dashjs`库实现，即对每个分块`<video>`元素的播放都用`dashjs`的方案控制：

```javascript
import { MediaPlayer } from "dashjs";

let videos = [];
let dashs = [];
let mpdUrls = [];

initVideos();
initMpdUrls();

for (let i = 0; i < tileNum; i++) {
  let video = videos[i];
  let dash = MediaPlayer().create();
  dash.initialize(video, mpdUrls[i], true);
  dash.updateSettings(dashSettings);
  dashs.push(dash);
}
```

通过对`dashSettings`的调整的可以设置各种可用的 dash 参数如不同质量版本下的缓冲区长度，播放暂停时是否终止后台下载等。

## 沉浸式场景体验

全景视频的完全的沉浸式体验目前在`Oculus Browser`上有两种实现方式：

1. 直接使用浏览器默认的全屏功能之后选择视频为：普通视频或 180 度视频或 360 度视频。
2. 使用最新的`WebXR session`的`layers`特性，手动代码实现。

第 1 种方式因为并没有给出实际的`API`，所以不可能与分块传输的视频相结合，所以只能使用第 2 种方式手动实现。

其对应的草案标准地址：https://www.w3.org/TR/webxrlayers-1/

![image-20220225120623180](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20220225120623180.png)

可以看到目前最新的开发标准刚在 1 个月前完成。

`WebXR`中的开发流程如下：

1. 判断浏览器是否支持`immersive-vr`，如果支持就请求`xrSession`，所需的特性为`layers`：

```javascript
import { WebXRButton } from "webxr-button.js";

let xrButton = new WebXRButton({
  onRequestSession: onRequestSession,
  onEndSession: onEndSession,
});
let xrSession = null;

function onRequestSession() {
  if (!xrSession) {
    navigator.xr
      .requestSession("immersive-vr", {
        requiredFeatures: ["layers"],
      })
      .then(onSessionStarted);
  } else {
    onEndSession();
  }
}

function onEndSession() {
  xrSession.end();
}

if (navigator.xr) {
  navigator.xr.isSessionSupported("immersive-vr").then((supported) => {
    if (supported) {
      xrButton.enabled = supported;
    }
  });
}
```

2. 获取到需要的`xrSession`之后请求`ReferenceSpace`，并创建会话中需要的对象，之后用创建的图层更新会话的渲染器状态，并设置`requestAnimationFrame`需要的回调函数：

```javascript
let xrRefSpace = null;
let xrMediaFactory = null;

function onSessionStarted(session) {
    xrSession = session;
    xrButton.textContent = "Exit XR";

    xrMediaFactory = new XRMediaBinding(session);

    session.requestReferenceSpace('local').then((refSpace) = {
        xrRefSpace = refSpace;

        let baseLayer = xrMediaFactory.createEquirectLayer(baseVideo, {
        	space: refSpace,
        	centralHorizontalAngle: Math.PI * 2
    	});
    	session.updateRenderState({layers: [baseLayer]});
    	session.requestAnimationFrame(onXRFrame);
    });
}
```

3. 最后设置每次`xrSession`要求渲染新帧的函数，并设定渲染循环：

```javascript
let xrViewerPose = null;

function onXRFrame(time, frame) {
  let session = frame.session;
  session.requestAnimationFrame(onXRFrame);

  xrViewerPose = frame.getViewerPose(xrRefSpace);
  console.log(xrViewerPose);
}
```

`onXRFrame`函数在每次渲染新帧时调用，其中每帧对应的观看者的相对位置以及头戴设备的线速度和角速度等变量可以从`xrViewerPose`中取得。

这么看`WebXR`的完全沉浸式体验是可行的，但是问题出在需要与分块结合。

`xrMediaFactory`作为`XRMediaBinding`绑定到当前`xrSession`的实例对象，可以用来创建采用等距长方形投影的方式的图层`XREquirectLayer`：

![image-20220225130500492](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20220225130500492.png)

虽然这里出现了可以创建采用`Equirectangular`方式投影的图层，并可以通过指定其初始化参数完成不同大小的偏移创建，但是这里的处理方式还是将一个完整视频从映射到球面上的方式，即不管怎么改变参数，创建出来的总是有 4 条曲边的球面块：

![image-20220225131212067](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20220225131212067.png)

并不能实现每个分块以特定的映射逻辑将其不重不漏的铺到球面上的功能。

不过就算可以实现这样的功能，因为 1 个图层与 1 个视频块相绑定，在实际创建中发现：

- 在一个`xrSession`中最多只能创建 16 个图层，并不能与`MxN`的分块逻辑相对应；

- 创建 16 个图层之后整个`xrSession`会变得异常卡顿，视频已无法正常播放；

那么是否可以先将多个分块的视频从空间上拼接好，将最终拼接好的视频进行等距长方投影？

首先从实际的实现上没法完成，因为每个视频在 h5 中本质是`<video>`元素，多个`<video>`元素并不能在`DOM`的基础上实现空间的复原，就算有办法做到，最后在与`layer`绑定时也必须是 1 个`<video>`元素而这 1 个`<video>`元素还需要实现各个部分的自适应码率变化，这完全是不可行的。

测试的代码地址：[media-layer-sample](https://github.com/ayamir/tiled-vr-dash-platform/blob/main/client/eqrt-media-demo/media-layer-sample.html)

进一步的解决办法是存在的：

因为目前的`WebXR`不能够满足需求，所以需要深入`WebGL`的层面，手动设计一套将各个分块以等距长方投影的方式映射到球面上的逻辑，同时还要与`WebXR`上层的处理 API 相对应，任务工作量和难度还需要进一步评估。

