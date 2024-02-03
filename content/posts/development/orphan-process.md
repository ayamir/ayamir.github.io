---
title: "孤儿进程"
date: 2024-01-29T10:31:56+08:00
draft: false
math: true
keywords: ["OS", "Shell", "Python"]
tags: ["OS", "Shell", "Python"]
categories: ["development"]
url: "posts/development/orphan-process"
---

## 问题背景

前两天室友问我，怎么 kill 掉在 Shell 脚本中调用的 Python 进程，我第一时间想到的是：打开 `htop`，把它调整成树形布局，然后搜索 Shell 脚本，选中之后把它 kill 掉，Python 进程应该也会被 kill 掉。

![image-20240129104955840](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20240129104955840.png)

但是结果是 Python 进程并没有变红，而是成为了 init 进程的子进程。

## 孤儿进程是怎么产生的

大二学 OS 学到父进程和子进程的概念的时候，还是只是以为父进程和子进程之间应该存在牢固的控制关系，父进程退出时子进程也应该默认退出。

但是 OS 的实际行为不是这样，子进程和父进程只是说明了二者之间存在谁创建谁的关系，并不存在牢固的控制关系（而是类似于现实中的父子关系）。

- 父进程结束时子进程并没有结束，子进程成为孤儿进程，会被 init 进程收养

- 父进程崩溃或异常终止

- 并发和竞争条件导致父子进程的结束顺序错误

## 如何避免孤儿进程的产生

其实就是需要在程序设计时，考虑到上述的这几种可能导致孤儿进程产生的原因，然后对异常情况进行注册和处理。对于开始时的这个引入问题而言，答案可以写成以下两个脚本：

```shell
#!/bin/bash

# 定义一个函数来处理信号
cleanup() {
	echo "捕捉到终止信号，正在终止 Python 进程..."
	kill $PYTHON_PID
	exit
}

# 在接收到 SIGINT || SIGTERM || SIGKILL 时执行 cleanup 函数
trap 'cleanup' SIGINT SIGTERM

# 启动 Python 脚本并获取其进程 ID
python example_python.py &
PYTHON_PID=$!

# 等待 Python 进程结束
wait $PYTHON_PID
```

```python
import time
import signal
import sys


# 定义信号处理函数
def signal_handler(signum, frame):
    print("Python 脚本接收到终止信号，正在退出...")
    sys.exit()


# 设置 SIGINT SIGTERM 的处理器
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Python 脚本的主逻辑
try:
    while True:
        print("Python 脚本正在运行...")
        time.sleep(1)
except KeyboardInterrupt:
    pass
```

通过在父进程和子进程中都注册相应的事件，就可以保证 kill 作为父进程的 Shell 进程之后，作为子进程的 Python 进程也会终止。

实际演示：`chmod +x example.sh example_python.py && bash example.sh`

![image-20240129110124042](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20240129110124042.png)

执行 `SIGTERM` 信号的 kill 之后，父子进程都被终止。

![image-20240129110653343](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20240129110653343.png)

需要注意的是，如果使用 `kill -9 $PARENT_PID` 的形式来杀死父进程的话，子进程并不会被杀死。

因为 `9` 这个编号对应的是 `SIGKILL` 信号，`SIGKILL` 信号被设计为不能被捕捉、阻塞或忽略的。`SIGKILL` 的主要用途是允许操作系统或用户强制终止一个进程，即使该进程处于非响应状态。（类似的还有 `SIGSTOP` 信号，用于暂停一个进程的执行，也不能被捕捉、阻塞或忽略。）

所以我们也无法在 Python 脚本中注册监听这个信号（强行注册 Python 脚本会无法运行）。

![image-20240129111153165](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20240129111153165.png)
