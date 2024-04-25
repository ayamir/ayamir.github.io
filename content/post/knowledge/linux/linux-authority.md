---
title: "Linux 权限相关命令解读"
date: 2021-03-15T21:43:35+08:00
draft: false
keywords: ["linux"]
tags: ["linux"]
categories: ["knowledge"]
url: "posts/knowledge/linux/linux-authority"
summary: "这篇博客主要描述了解决 Linux 上与用户权限相关的命令解读。"
---

## 文件和目录的权限

下图为使用[exa](https://github.com/ogham/exa)命令的部分截图

![img](https://i.loli.net/2021/10/09/Wcv5mqJMysjzFKf.png)

上图中的 Permission 字段下面的字母表示权限
第一个字母表示 **文件类型** ：

<table border="2" cellspacing="0" cellpadding="6" rules="groups" frame="hsides">

<colgroup>
<col  class="org-left" />

<col  class="org-left" />
</colgroup>
<tbody>
<tr>
<td class="org-left">属性</td>
<td class="org-left">文件类型</td>
</tr>

<tr>
<td class="org-left">-</td>
<td class="org-left">普通文件</td>
</tr>

<tr>
<td class="org-left">d</td>
<td class="org-left">目录文件</td>
</tr>

<tr>
<td class="org-left">l</td>
<td class="org-left">符号链接 符号链接文件剩余的属性都是 rwxrwxrwx，是伪属性值，符号链接指向的文件属性才是真正的文件属性</td>
</tr>

<tr>
<td class="org-left">c</td>
<td class="org-left">字符设备文件 表示以字节流形式处理数据的设备，如 modem</td>
</tr>

<tr>
<td class="org-left">b</td>
<td class="org-left">块设备文件 表示以数据块方式处理数据的设备，如硬盘驱动或光盘驱动</td>
</tr>
</tbody>
</table>

剩下的 9 个位置上的字符称为 **文件模式** ，每 3 个为一组，分别表示文件所有者、文件所属群组以及其他所有用户对该文件的读取、写入和执行权限

<table border="2" cellspacing="0" cellpadding="6" rules="groups" frame="hsides">

<colgroup>
<col  class="org-left" />

<col  class="org-left" />

<col  class="org-left" />
</colgroup>
<tbody>
<tr>
<td class="org-left">属性</td>
<td class="org-left">文件</td>
<td class="org-left">目录</td>
</tr>

<tr>
<td class="org-left">r</td>
<td class="org-left">允许打开和读取文件</td>
<td class="org-left">如果设置了执行权限，允许列出目录下的内容</td>
</tr>

<tr>
<td class="org-left">w</td>
<td class="org-left">允许写入或截断文件，但是不允许重命名或删除文件</td>
<td class="org-left">如果设置了执行权限，那么允许目录中的文件被创建、被删除和被重命名</td>
</tr>

<tr>
<td class="org-left">x</td>
<td class="org-left">允许把文件当作程序一样来执行</td>
<td class="org-left">允许进入目录</td>
</tr>
</tbody>
</table>

## id：显示用户身份标识

一个用户可以拥有文件和目录，同时对其拥有的文件和目录有控制权
用户之上是群组，一个群组可以由多个用户组成
文件和目录的访问权限由其所有者授予群组或者用户

下图为 Gentoo Linux 下以普通用户身份执行 id 命令的结果

![img](https://i.loli.net/2021/10/09/qGhlVa9DRfIMP4T.png)

uid 和 gid 分别说明了当前用户的用户编号与用户名、所属用户组的编号与组名
groups 后的内容说明了用户还属于哪些组，说明了其对应的编号和名称

许多类 UNIX 系统会将普通用户分配到一个公共的群组中如：users
现代 Linux 操作是创建一个独一无二的只有一个用户的同名群组

## chmod：更改文件模式

chmod 支持两种标识方法

1.  八进制表示法

    <table border="2" cellspacing="0" cellpadding="6" rules="groups" frame="hsides">

    <colgroup>
    <col  class="org-right" />

    <col  class="org-right" />

    <col  class="org-left" />
    </colgroup>
    <tbody>
    <tr>
    <td class="org-right">八进制</td>
    <td class="org-right">二进制</td>
    <td class="org-left">文件模式</td>
    </tr>

    <tr>
    <td class="org-right">0</td>
    <td class="org-right">000</td>
    <td class="org-left">---</td>
    </tr>

    <tr>
    <td class="org-right">1</td>
    <td class="org-right">001</td>
    <td class="org-left">--x</td>
    </tr>

    <tr>
    <td class="org-right">2</td>
    <td class="org-right">010</td>
    <td class="org-left">-w-</td>
    </tr>

    <tr>
    <td class="org-right">3</td>
    <td class="org-right">011</td>
    <td class="org-left">-wx</td>
    </tr>

    <tr>
    <td class="org-right">4</td>
    <td class="org-right">100</td>
    <td class="org-left">r--</td>
    </tr>

    <tr>
    <td class="org-right">5</td>
    <td class="org-right">101</td>
    <td class="org-left">r-x</td>
    </tr>

    <tr>
    <td class="org-right">6</td>
    <td class="org-right">110</td>
    <td class="org-left">rw-</td>
    </tr>

    <tr>
    <td class="org-right">7</td>
    <td class="org-right">111</td>
    <td class="org-left">rwx</td>
    </tr>
    </tbody>
    </table>

    常用的模式有 7,6,5,4,0

2.  符号表示法

    <table border="2" cellspacing="0" cellpadding="6" rules="groups" frame="hsides">

    <colgroup>
    <col  class="org-left" />

    <col  class="org-left" />
    </colgroup>
    <tbody>
    <tr>
    <td class="org-left">符号</td>
    <td class="org-left">含义</td>
    </tr>

    <tr>
    <td class="org-left">u</td>
    <td class="org-left">user：表示文件或目录的所有者</td>
    </tr>

    <tr>
    <td class="org-left">g</td>
    <td class="org-left">group：文件所属群组</td>
    </tr>

    <tr>
    <td class="org-left">o</td>
    <td class="org-left">others：表示其他用户</td>
    </tr>

    <tr>
    <td class="org-left">a</td>
    <td class="org-left">all：u+g+o</td>
    </tr>
    </tbody>
    </table>

    如果没有指定字符默认使用`all`
    `+` 表示添加一种权限
    `-` 表示删除一种权限
    例如：

    <table border="2" cellspacing="0" cellpadding="6" rules="groups" frame="hsides">

    <colgroup>
    <col  class="org-left" />

    <col  class="org-left" />
    </colgroup>
    <tbody>
    <tr>
    <td class="org-left">符号</td>
    <td class="org-left">含义</td>
    </tr>

    <tr>
    <td class="org-left">u+x</td>
    <td class="org-left">所有者+可执行</td>
    </tr>

    <tr>
    <td class="org-left">u-x</td>
    <td class="org-left">所有者-可执行</td>
    </tr>

    <tr>
    <td class="org-left">+x</td>
    <td class="org-left">所有用户+可执行</td>
    </tr>

    <tr>
    <td class="org-left">o-rw</td>
    <td class="org-left">其他用户-读写</td>
    </tr>

    <tr>
    <td class="org-left">go=rw</td>
    <td class="org-left">群组用户和其他用户权限更改为读，写</td>
    </tr>

    <tr>
    <td class="org-left">u+x,go=rx</td>
    <td class="org-left">所有者+可执行，群组用户和其他用户权限更改为读，可执行</td>
    </tr>
    </tbody>
    </table>

    `-R` 表示递归设置

## umask：设置文件默认权限

使用八进制表示法表示从文件模式属性中删除一个位掩码
掩码的意思：用掩码来取消不同的文件模式

plain umask

可以看到输出为：

plain 0022

不同 linux 发行版默认的文件权限不同，这里的输出是 Gentoo Linux 上普通用户对应的的输出
0022：先不看第一个 0,后面的 0|2|2 用二进制展开结果是：000|010|010

<table border="2" cellspacing="0" cellpadding="6" rules="groups" frame="hsides">

<colgroup>
<col  class="org-left" />

<col  class="org-left" />

<col  class="org-left" />

<col  class="org-left" />

<col  class="org-left" />
</colgroup>
<tbody>
<tr>
<td class="org-left">原始文件模式</td>
<td class="org-left">---</td>
<td class="org-left">rw-</td>
<td class="org-left">rw-</td>
<td class="org-left">rw-</td>
</tr>

<tr>
<td class="org-left">掩码</td>
<td class="org-left">000</td>
<td class="org-left">000</td>
<td class="org-left">000</td>
<td class="org-left">010</td>
</tr>

<tr>
<td class="org-left">结果</td>
<td class="org-left">---</td>
<td class="org-left">rw-</td>
<td class="org-left">rw-</td>
<td class="org-left">r--</td>
</tr>
</tbody>
</table>

掩码中 1 对应位处的权限会被取消，0 则不受影响
所以会有这样的结果：

![img](https://i.loli.net/2021/10/09/rj8DkcipUN1Ro94.png)

再来谈最前面的 0:因为除了 rwx 之外还有较少用到的权限设置

1.  setuid 位:4000(8 进制)
    设置此位到一个可执行文件时，有效用户 ID 将从实际运行此程序的用户 ID 变成该程序拥有者的 ID
    设置场景：应用于由 root 用户拥有的程序，当普通用户运行一个具有 setuid 位的程序时，这个程序会以超级用户的权限执行，因此可以访问普通用户无法访问到的文件和目录
    设置程序 setuid：

    plain chmod u+s program_name

    结果：

    plain -rwsr-xr-x

    可以看到第二组权限中第一个符号是 s

2.  setgid 位:2000(8 进制)
    有效组 ID 从该用户的实际组 ID 更改为该文件所有者的组 ID
    设置场景：当一个公共组下的成员需要访问共享目录下的所有文件时可以设置此位
    对一个目录设置 setgid 位，则该目录下新创建的文件将由该目录所在组所有

    plain chmod g+s dir_name

    结果：

    plain drwxrwsr-x

    可以看到第二组权限中最后一个符号是 s(替换了 x)

3.  sticky 位:1000(8 进制)
    标记一个可执行文件是“不可交换的”，linux 中默认会忽略文件的 sticky 位，但是对目录设置 sticky 位，能阻止用户删除或者重命名文件，除非用户是这个目录的所有者，文件所有者或者 root
    用来控制对共享目录的访问

    plain chmod +t dir_name

    结果：

    plain drwxrwxrwt

    可以看到第三组权限中最后一个符号是 t(替换了 x)

## su：以另一个用户身份运行 shell

### 使用 su 命令登录

plain su [-[l]] [user]

如果包含&ldquo;-l&rdquo;选项，得到的 shell session 会是 user 所指定的的用户的登录 shell
即 user 所指定的用户的运行环境将会被加载，工作目录会更改为此用户的主目录

![img](https://i.loli.net/2021/10/09/TpIV2iMqsaLfQcS.png)

### 使用 su 命令执行单个命令

plain su -c 'comand'

命令内容必须用 **&rsquo;&rsquo;** 引用起来（也可以是双引号）

![img](https://i.loli.net/2021/10/09/uEbASzKVMjonCrl.png)

## sudo：以另一个用户身份执行命令

### sudo 和 su 的区别

1.  sudo 比 su 有更丰富的功能，而且可以配置
    通过修改配置文件来配置 sudo

    plain EDITOR=vim visudo

    执行上面的命令可以用 vim 来编辑 sudo 的配置文件
    常用的场景是在将用户加入到 wheel 组之后使 wheel 组的用户能够访问 root 权限

2.  使用 sudo 命令输入的不是 root 的密码，而是自己的密码
    可以使用 \`sudo -l\`来查看通过 sudo 命令能获得的权限

## chown：更改文件所有者

### 用法

plain chown [owner]:[group]] file ...

第一个参数决定 chown 命令更改的是文件所有者还是文件所属群组，或者对两者都更改

<table border="2" cellspacing="0" cellpadding="6" rules="groups" frame="hsides">

<colgroup>
<col  class="org-left" />

<col  class="org-left" />
</colgroup>
<tbody>
<tr>
<td class="org-left">参数</td>
<td class="org-left">结果</td>
</tr>

<tr>
<td class="org-left">bob</td>
<td class="org-left">文件所有者=&gt;bob</td>
</tr>

<tr>
<td class="org-left">bob:users</td>
<td class="org-left">文件所有者=&gt;bob 文件所属群组=&gt;users</td>
</tr>

<tr>
<td class="org-left">:admins</td>
<td class="org-left">文件所属群组=&gt;admins</td>
</tr>

<tr>
<td class="org-left">bob:</td>
<td class="org-left">文件所有者=&gt;bob 文件所属群组=&gt;bob 登录系统时的组</td>
</tr>
</tbody>
</table>

![img](https://i.loli.net/2021/10/09/JPhtm3ws4eg1k9D.png)

图中使用 root 用户在/home/ayamir 目录下创建了一个 foo.txt 文件，最后将此文件的所有者和所属组都改为了 ayamir（rg 是[ripgrep](https://github.com/BurntSushi/ripgrep)）

## chgrp：更改文件所属群组

这个命令是历史遗留问题，在早期的 UNIX 版本中，chown 只能更改文件的所有者，而不能改变文件的所属群组，因此出现了这个命令，事实上现在的 chown 已经能实现 chgrp 的功能，因此没必要再使用这个命令（其使用方式几乎与 chown 命令相同）

## passwd：更改用户密码

### 一般用法

plain passwd [user]

用来更改 user 用户的密码，如果想修改当前用户的密码则不需要指定 user
执行之后会提示输入旧密码和新密码，新密码需要再确认输入一次
拥有 root 用户权限的用户可以设置所有用户的密码

![img](https://i.loli.net/2021/10/09/pHGXkgJlaM63KnE.png)

上图为 Gentoo Linux 下使用 passwd 命令修改 ayamir 用户密码的过程，这里可以看到 passwd 会强迫用户使用强密码，会拒绝短密码或容易猜到的密码（其他发行版可能输出会不一样）
