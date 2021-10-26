---
title: "重学C++：Const二三事"
date: 2021-10-26T15:53:11+08:00
draft: false
math: true
keywords: ["C++"]
tags: ["C++"]
categories: ["Programming Language"]
---

## 常见的坑

1. 仅用`const`修饰的对象只在单个文件中有效，如果想在多个文件之间共享`const`对象，必须在对象**定义**的前面加`extern`。

2. 允许为一个常量引用绑定非常量的对象、字面量和表达式。

   ```C++
   int i = 42;
   const int &r1 = i;       // 正确
   const int &r2 = 42;      // 正确
   const int &r3 = r1 * 2;  // 正确
   int &r4 = r1 * 2;        // 错误
   int &r5 = i;
   r5 = 0;                  // 正确
   r1 = 42;                 // 错误
   ```

3. 指向常量的指针和常量指针：

   ```C++
   int errNumb = 0;
   const double pi = 3.1415;
   
   int *const curErr = &errNumb;
   const double *mutPPi = &pi;
   const double *const pPi = &pi;
   ```

   从声明语句的变量符号开始，自右向左看：

   `curErr`首先是一个不可变对象，其次是一个指向`int`类型可变对象的指针。

   `mutPPi`首先是一个可变对象，其次是一个指向`double`类型不可变对象的指针。

   `pPi`首先是一个不可变对象，其次是一个指向`double`类型不可变对象的指针。

## 必须要理解的点

1. `const`对象在创建时必须进行初始化。

2. 常量引用即对`const`对象的引用。

3. 常量引用绑定*不可变对象*和*可变对象*时含义不同。

   |                |          可变对象          |     不可变对象     |
   | :------------: | :------------------------: | :----------------: |
   | 用常量引用绑定 |            可以            |        必须        |
   | 常量引用的含义 | 不能通过此引用改变对象的值 | 不可以改变对象的值 |

   常量引用绑定到可变对象上：对原有可操作性质的窄化，减少操作肯定不会引发错误，所以是允许的。

   非常量引用绑定到不可变对象上：对原有可操作性质的拓宽，增加不允许的操作会出错、，所以不可变对象必须使用常量引用。

4. 因为指针是对象，而引用不是对象，所以`const`和指针的组合有2种情况，`const`和引用的组合只有1种情况。

   + 指针
     + 指向常量的指针（pointer to const）：不能通过此指针修改对应的量。
     + 常量指针（const pointer）：指针本身的值不可变，即不能用指针指向其他对象，这种不可重新绑定的特性类似于引用。
   + 引用
     + 常量引用：不能通过此引用修改对应的量。