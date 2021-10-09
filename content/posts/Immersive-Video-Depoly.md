---
title: "Immersive Video OMAF-Sample Depoly"
date: 2021-10-09T15:31:46+08:00
keywords: ["Immersive-Video", "Ubuntu", "Docker"]
tags: ["Immersive-Video"]
categories: ["Immersive-Video"]
draft: false
---

原仓库地址：[Immersive-Video-Sample](https://github.com/OpenVisualCloud/Immersive-Video-Sample)

修改之后的仓库：[Immersive-Video-Sample](https://github.com/ayamir/Immersive-Video-Sample)

# Server 端搭建

1. 修改 Dockerfile

- 手动设置 wget 和 git 的 http_proxy

- [旧 package 目录](https://download-ib01.fedoraproject.org/pub/epel/7/x86_64/Packages/e/epel-release-7-13.noarch.rpm) not found，
  修改为[新 package 目录](https://rpmfind.net/linux/epel/7/aarch64/Packages/e/epel-release-7-12.noarch.rpm)

- 因为找不到 glog 库因此加入软链接操作

  `ln -s /usr/local/lib64/libglog.so.0.6.0 /usr/local/lib64/libglog.so.0 `

2. 重新编译内核

   运行脚本时显示 libnuma 错误因此推断与 numa 设置有关

   执行`numactl -H`显示只有一个 node，报错输出显示需要至少两个 numa 节点

   关于 numa(Non-Uniform Memory Access)实际与物理 cpu 设置相关

   查询资料之后获知可以使用 fake
   numa 技术创造新节点，但是 Ubuntu 默认的内核没有开启对应的内核参数

   - 手动下载 Linux 内核源代码到`/usr/src/`目录

     `wget https://mirrors.edge.kernel.org/pub/linux/kernel/v5.x/linux-5.11.1.tar.gz`

   - 解压

     `tar xpvf linux-5.11.1.tar.gz`

   - 复制现有内核配置

     `cd linux-5.11.1 && cp -v /boot/config-$(uname -r) .config`

   - 安装必要的包

     `sudo apt install build-essential libncurses-dev bison flex libssl-dev libelf-dev`

   - 进入内核配置界面

     `sudo make menuconfig`

   - 按下`/`键分别查询`CONFIG_NUMA`和`CONFIG_NUMA_EMU`位置

   - 手动勾选对应选项之后保存退出

   - 重新编译并等待安装结束

     `sudo make -j $(nproc) && sudo make modules_install && sudo make install`

3. 修改`grub`启动参数加入fake numa配置

   `sudo vim /etc/default/grub`

   `GRUB_CMDLINE_LINUX="numa=fake=2"`

4. 更新`grub`并重启

   `sudo update-grub && sudo reboot`

5. 执行`numactl -H`检查numa节点数目为2

6. 重新执行脚本一切正常

# Client端搭建

需要Ubuntu18.04环境，虚拟机中安装之后按照README命令，执行脚本一切正常
