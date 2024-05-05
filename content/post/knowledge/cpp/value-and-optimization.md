---
title: "C++中的值和优化"
date: 2024-05-05T22:34:31+08:00
draft: false
math: true
keywords: ["C++"]
tags: ["C++"]
categories: ["knowledge"]
summary: "这篇博客主要学习记录C++中值和与之相关的优化"
---

## 值类型

正如之前博客中所提到的，C++中的表达式要么是左值，要么是右值。左值是可以获得地址的表达式，但是不能被移动，而右值是可以被移动的表达式，但是不能取地址。

如果细分值类型的话，我们前面提到的左值其实属于泛左值glvalue(generalizaed lvalue)。泛左值glvalue可以分为2种：左值lvalue、将亡值xvalue(eXpiring value)。而右值rvalue也可以分为2种：将亡值xvalue(eXpiring value)和纯右值prvalue(pure rvalue)。直接提出这些概念可能比较突兀，下面详细解释一下这些概念的意思：

- glvalue：具名(named)表达式，拥有身份(identity)
- lvalue：具名(named)表达式，不可移动(not moveable)
- xvalue：具名(named)表达式，可移动(moveable)
- prvalue：可移动(moveable)表达式，不具名(not named)
- rvalue：可移动(moveable)表达式

![image-20240505225846482](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20240505225846482.png)

所以可以看出，区分泛左值和右值的关键在于是否具名和是否可移动，比如：

```c++
struct A {
   int x;
};

void f(A&&) {}

A&& g();

int main() {
   int a = 4;       // "a" => lvalue, "4" => prvalue
   f(A{4});         // "A{4}" => prvalue

   A&& b = A{3};    // "A&& b" => named rvalue reference => lvalue
   A c{4};
   f(std::move(c)); // "std::move(c)" => xvalue
   f(A{}.x);        // "A{}.x" => xvalue
   g();             // "A&&" => xvalue
   return 0;
}
```

## 拷贝消除和返回值优化RVO

之前说过，为了避免**深拷贝**操作的开销，所以引入了移动语义来进行对象所属成员的**浅拷贝**，但是不论如何都是要进行拷贝操作的，那有没有可以避免拷贝的特性？答案就是拷贝消除。

拷贝消除是一种编译器的优化手段，这种方式可以消除任何的拷贝操作（拷贝或者移动）。而拷贝消除主要起作用的地方就是返回值优化RVO。

返回值优化也可以分为两种：RVO和命名返回值优化NRVO

- **RVO**：对于返回值，编译器可以避免创造临时对象。
- **NRVO**：对于返回值，编译器可以直接返回一个对象，但是并不调用拷贝/移动构造函数。

在没有RVO的时候，函数返回一个对象的开销是比较大的：

```c++
#include <iostream>

struct A {
   A() {
      std::cout << "constructor\n";
   }
   A(const A&) {
      std::cout << "copy constructor\n";
   }
private:
   int x;
};

A f() { return A{}; }

int main() {
   auto a1 = f();    // a1 is constructed by calling copy constructor
   return 0;
}
```

### RVO

在C++11中，什么时候编译器会进行RVO呢？有两个条件：

1. RVO的对象是一个prvalue
2. 相应类型有一个trivial的拷贝构造函数

```c++
struct Trivial {
   Trivial() = default;
   Trivial(const Trivial&) = default;
};
// single instance of prvalue
Trivial f1() {
   return Trivial{}; // Guarantee RVO
}
// distinct instances of prvalue and runtime selection
Trivial f2(bool b) {
   return b ? Trivial{} : Trivial{}; // Guarantee RVO
}

int main() {
   f1();
   f2();
   return 0;
}
```

而在C++17中，即使拷贝构造函数是non-trivial或者deleted，只要返回的对象是一个prvalue，就会保证RVO。

```c++
struct S1 {
   S1() = default;
   S1(const S1&) = delete; // deleted
};
struct S2 {
   S2() = default;
   S2(const S2&) {} // non-trivial
};
S1 f() { return S1{}; }
S2 g() { return S2{}; }

int main() {
   auto x1 = f(); // compile error in C++11/14
   auto x2 = g(); // RVO only in C++17
}
```

### NRVO

即使在C++17中，NRVO也不总是生效的，下面是一些例子：

```c++
A f1() {
   A a;
   return a; // most compilers apply NRVO
}

A f2(bool v) {
   A a;
   if (v) return a; // move/copy constructor
   return A{}; // RVO
}

A f3(bool v) {
   A a, b;
   return v ? a : b; // move/copy constructor
}

A f4() {
   A a;
   return std::move(a); // force move constructor
}

A f5() {
   static A a;
   return a;  // only copy constructor
}

A f6(A& a) {
   return a;  // only copy constructor (a reference cannot be elided)
}

A f7(const A& a) {
   return a;  // only copy constructor (a reference cannot be elided)
}

A f8(const A a) {
   return a;  // only constructor (a const object cannot be elided)
}

A f9(A&& a) {
   return a;  // only copy constructor (the object is instantiated in the function)
}
```
