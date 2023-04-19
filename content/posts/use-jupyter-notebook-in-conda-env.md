---
title: "Use Jupyter Notebook in Conda Env"
date: 2022-02-15T17:19:26+08:00
draft: false
math: true
keywords: ["Conda", "Jupyter"]
tags: ["Conda", "Jupyter"]
categories: ["Python"]
---

0. 远程启动`jupyter notebool`：

   ```shell
   jupyter notebook --no-browser --ip="<server-ip>" --port="<server-port>"
   ```

1. 激活预先配置好的`conda`环境，这里假设环境名为`keras-tf-2.1.0`：

   ```sh
   conda activate keras-tf-2.1.0
   ```

2. 安装`ipykernel`：

   ```shell
   pip3 install ipykernel --user
   ```

3. 为`ipykernel`安装环境：

   ```sh
   python3 -m ipykernel install --user --name=keras-tf-2.1.0
   ```

4. 打开`notebook`更改服务之后刷新即可：

   ![image-20220215172551183](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20220215172551183.png)

   
