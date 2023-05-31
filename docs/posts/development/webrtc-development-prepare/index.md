# 在Linux下如何搭建WebRTC的开发环境


本文主要记录笔者在 Gentoo Linux 下面搭建 WebRTC 开发环境的过程。

## 准备工作

1. 网络：可以科学上网的梯子
2. IDE：VSCode 或者 CLion

## 安装`depot_tools`

Google 有自己的一套用于管理 Chromium 项目的工具，名叫`depot_tools`，其中有包括`git`在内的一系列工具和脚本。

<img src="https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20230427003507935.png" alt="image-20230427003507935" style="zoom:80%;" />

```shell
# 创建google目录用于存储google相关的代码
mkdir ~/google
cd ~/google
# clone depot_tools
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
```

克隆完成之后需要将`depot_tools`的路径加到`PATH`中，Linux 上添加环境变量最简单的方式是修改`~/.profile`，这种方式与你的登录 shell 是什么没有关系，不管是`fish`还是`bash`还是`zsh`都会吃这种方式：

```shell
# ~/.profile
export GOOGLE_BIN=$HOME/google/depot_tools
export PATH=$GOOGLE_BIN:$PATH
```

但是这种方式需要你注销重新登录。

## 克隆代码

```shell
mkdir webrtc-checkout
cd webrtc-checkout
fetch --nohooks webrtc
gclient sync
```

整个 WebRTC 的项目代码大小约 20G，克隆过程中需要保证网络畅通顺畅，如果你的梯子有大流量专用节点最好，否则可能克隆完你的流量就用光了。

克隆期间可能会因为网络问题中断，重新执行`gclient sync`即可，直到所有的模块都克隆完毕。

按照官方的建议，克隆完成之后创建自己的本地分支，因为官方分支更新很快，不 checkout 的话，可能你的 commit 还没写完，就被 Remote 的 change 给覆盖了，还要手动处理冲突。

```shell
cd src
git checkout master
git new-branch <branch-name>
```

## 编译 WebRTC

关于 WebRTC 的版本可以在[Chromium Dash](https://chromiumdash.appspot.com/branches)查到：

<img src="https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20230427010325904.png" alt="image-20230427010325904" style="zoom:80%;" />

如上图所示，113 分支是当前的稳定分支，对应的 tag 是`branch-heads/5672`：

```shell
cd ~/google/webrtc-checkout/src
git checkout branch-heads/5672
git switch -c m113
```

创建本地分支之后就可以用`gn`生成`ninja`文件了：

```shell
gn gen out/Default --root="." --args='is_debug=true target_os="linux" target_cpu="x64" rtc_include_tests=false rtc_use_h264=true rtc_enable_protobuf=false is_clang=true symbol_level=0 enable_iterator_debugging=false is_component_build=false use_rtti=true rtc_use_x11=true use_custom_libcxx=false treat_warnings_as_errors=false use_ozone=true'
```

这里使用了`clang`并且启用了`h264`，详细的`gn`参数可以参考[gn-build-configuration](https://www.chromium.org/developers/gn-build-configuration/)和项目根目录下的`webrtc.gni`文件。

之后使用`autoninja`进行编译，编译时会吃满你 PC 的所有核心，编译时间取决于你 PC 的配置：

```shell
autoninja -C out/Default
```

<img src="https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20230427011455974.png" alt="image-20230427011455974" style="zoom:80%;" />

可以看到默认生成了几个样例的可执行文件。

<img src="https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20230427011556056.png" alt="image-20230427011556056" style="zoom:80%;" />

cd 到`obj`目录下可以看到`libwebrtc.a`文件，就是编译链接之后最终生成的可以引用的库文件。

## 搭建开发环境

Google 官方给出了 Chromium 项目的[CLion 配置指南](https://chromium.googlesource.com/chromium/src.git/+/master/docs/clion.md#Building_Running_and-Debugging-within-CLion)，所以只需要照猫画虎给 WebRTC 配置一下。

### 配置 CLion 属性

因为整个项目比较大，所以需要调大 CLion 的 VM 内存和 intellisence 支持的文件大小：

`Help`-> `Edit Custom VM Options`，在文件的末尾添加：

```
-Xmx8g
```

表示给 VM 设定`8G`的可用内存，这样基本上不用担心使用过程因为内存不足而 CLion 性能不够了。

`Help`->`Edit Custom Properties`，在文件的末尾添加：

```
idea.max.intellisense.filesize=12500
```

表示为大小为`12500KB`也就是`12M`以下的文件提供 intellisense 支持。

### 配置 gdb

```shell
vim ~/.gdbinit

# 添加下面一行
source ~/google/webrtc-checkout/src/tools/gdb/gdbinit
```

之后在 CLion 中的`Settings`->`Toolchain`->`Debugger`选择系统自带的 gdb：`/usr/bin/gdb`即可。

### 配置 intellisense

因为 WebRTC 用的是`gn`+`ninja`作为构建工具，而`CLion`目前只支持`cmake`，所以当要求配置`CMakeLists.txt`时直接无视即可。网络上有说用`gn_to_cmake.py`这个脚本的，但是我没看懂这东西的功能，反正是不能生成`CMakeLists.txt`，只是生成一个`json`文件，并不能用于 CLion 的索引。

我这边成功开启 IDE 语法高亮和索引的姿势是这样的：

```
cd webrtc-checkout/src
python3 ./tools/clang/scripts/generate_compdb.py -p ./out/Default -o ./compile_commands.json --target_os=linux
```

这一步会生成 CLion 可以自动识别的`compile_commands.json`文件，从而可以正确索引项目的代码并提供代码补全功能。

<img src="https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20230427011803234.png" alt="image-20230427011803234" style="zoom:80%;" />

之后每次启动项目 CLion 就会自动索引项目文件，就可以愉快地看代码和写代码啦！

