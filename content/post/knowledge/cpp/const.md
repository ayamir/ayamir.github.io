---
title: "重学C++：Const二三事"
date: 2021-10-26T15:53:11+08:00
draft: false
math: true
keywords: ["C++"]
tags: ["C++"]
categories: ["knowledge"]
url: "posts/knowledge/cpp/const"
summary: "这篇博客主要讨论了 C++ 中 Const 相关的用法。"
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
   int err_numb = 0;
   const double pi = 3.1415;

   int *const cur_err = &err_numb;
   const double *mut_pi_pointer = &pi;
   const double *const pi_pointer = &pi;
   ```

   从声明语句的变量符号开始，自右向左看：

   `cur_err`首先是一个不可变对象，其次是一个指向`int`类型可变对象的指针。

   `mut_pi_pointer`首先是一个可变对象，其次是一个指向`double`类型不可变对象的指针。

   `pi_pointer`首先是一个不可变对象，其次是一个指向`double`类型不可变对象的指针。

4. 当`typedef`遇到`const`时容易出现错误理解：

   ```C++
   typedef char *pstring;
   const pstring cstr = 0;
   const pstring *ps = 0;
   ```

   `pstring`是`char *`的别名，即指向`char`的指针。

   `const`修饰的是`pstring`，因此`cstr`是：初始化值为`nullptr`的**不可变指针**。

   错误理解会用`char *`替换掉`pstring`，即：

   ```c++
   const char *cstr = 0;
   ```

   这样从`cstr`开始自右向左读的话，`cstr`就会被理解成：指向**字符常量**的**可变指针**。

5. `constexpr`属于顶层`const`，因此`constexpr`修饰指针意味着指针本身不可变。

6. `auto`默认会去除顶层`const`，保留底层`const`，如果需要顶层`const`则需要显式加入。

   ```C++
   int i = 0;
   const int ci = i, &cr = ci;
   auto b = ci;       // b是一个初始化值为0的可变int对象
   auto c = cr;       // c同b
   auto d = &i;       // d是一个初始化为指向可变int类对象i的可变指针对象
   auto e = &ci;      // e是一个初始化为指向不可变int类对象ci的可变指针对象
   const auto f = ci; // f是一个初始化值为0的不可变int对象
   ```

7. `decltype`不会去除顶层`const`。

   ```C++
   const int ci = 0;
   decltype(ci) x = 0;   // x的类型是const int
   ```

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

4. 因为指针是对象，而引用不是对象，所以`const`和指针的组合有 2 种情况，`const`和引用的组合只有 1 种情况。

   - 指针
     - 指向常量的指针（pointer to const）：不能通过此指针修改对应的量。
     - 常量指针（const pointer）：指针本身的值不可变，即不能用指针指向其他对象，这种不可重新绑定的特性类似于引用。
   - 引用
     - 常量引用：不能通过此引用修改对应的量。

5. 顶层`const`表示指针本身是常量，推广之后可以指任意对象是常量；

   底层`const`表示指针指向的对象是常量，推广之后主要于指针和引用等复合类型的基本类型部分有关。

6. **常量表达式**指：值不会改变，在编译过程中就能得到计算结果的表达式。

7. 为什么需要`constexpr`？

   因为实际中很难判断一个初始值是否为常量表达式。

   使用`constexpr`相当于把验证变量的值是否是一个常量表达式的工作交给了编译器。

   用`constexpr`声明的变量一定是一个变量，并且必须用常量表达式来初始化。

## 建议

1. 如果认定变量是一个常量表达式，那就将其声明成`constexpr`类型。
