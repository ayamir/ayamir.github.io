# 部署 Immersive Video OMAF-Sample


原仓库地址：[Immersive-Video-Sample](https://github.com/OpenVisualCloud/Immersive-Video-Sample)

修改之后的仓库：[Immersive-Video-Sample](https://github.com/ayamir/Immersive-Video-Sample)

## Server 端搭建

### 修改 Dockerfile

1. 手动设置 wget 和 git 的 http_proxy

2. [旧 package 目录](https://download-ib01.fedoraproject.org/pub/epel/7/x86_64/Packages/e/epel-release-7-13.noarch.rpm) not found，修改为[新 package 目录](https://rpmfind.net/linux/epel/7/aarch64/Packages/e/epel-release-7-12.noarch.rpm)

3. 因为找不到 glog 库因此加入软链接操作

```shell
ln -s /usr/local/lib64/libglog.so.0.6.0 /usr/local/lib64/libglog.so.0
```

### 重新编译内核

运行脚本时显示 libnuma 错误因此推断与 numa 设置有关

执行`numactl -H`显示只有一个 node，报错输出显示需要至少两个 numa 节点

查询资料之后获知可以使用 fakenuma 技术创造新节点，但是 Ubuntu 默认的内核没有开启对应的内核参数

1. 手动下载 Linux 内核源代码到`/usr/src/`目录

```shell
wget https://mirrors.edge.kernel.org/pub/linux/kernel/v5.x/linux-5.11.1.tar.gz
```

2. 解压

```shell
tar xpvf linux-5.11.1.tar.gz
```

3. 复制现有内核配置

```shell
cd linux-5.11.1 && cp -v /boot/config-$(uname -r) .config
```

4. 安装必要的包

```shell
sudo apt install build-essential libncurses-dev bison flex libssl-dev libelf-dev
```

5. 进入内核配置界面

```shell
sudo make menuconfig
```

![image-20211009193021685](https://i.loli.net/2021/10/09/nF4faG93X6L5CsV.png)

6. 按下`/`键分别查询`CONFIG_NUMA`和`CONFIG_NUMA_EMU`位置

![image-20211009193047750](https://i.loli.net/2021/10/09/B6YvCUfxwFyQDzZ.png)

7. 手动勾选对应选项之后保存退出

![image-20211009192905903](https://i.loli.net/2021/10/09/aTsqJfkxNznE8Yw.png)

8. 重新编译并等待安装结束

```shell
sudo make -j $(nproc) && sudo make modules_install && sudo make install
```

9. 修改`grub`启动参数加入 fake numa 配置

```shell
sudo vim /etc/default/grub
```

找到对应行并修改为

```shell
GRUB_CMDLINE_LINUX="numa=fake=2"
```

![image-20211009193122989](https://i.loli.net/2021/10/09/kSg1xMt3aNJXviQ.png)

10. 更新`grub`并重启

```shell
sudo update-grub && sudo reboot
```

11. 执行`numactl -H`检查 numa 节点数目为 2

![image-20211009193147756](https://i.loli.net/2021/10/09/TksudNKlZYpGCB4.png)

12. 重新执行脚本如图说明一切正常

![image-20211009193252833](https://i.loli.net/2021/10/09/zDc3qXB98vZAOie.png)

## Client 端搭建

需要 Ubuntu18.04 环境，虚拟机中安装之后按照 README 命令，执行脚本一切正常

![image-20211009193325118](https://i.loli.net/2021/10/09/75BOFntKyeTIrhv.png)

