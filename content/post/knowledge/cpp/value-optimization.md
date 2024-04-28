---
title: "引用与优化"
date: 2024-04-28T22:49:37+08:00
draft: false
math: true
keywords: ["C++"]
tags: ["C++"]
categories: ["knowledge"]
summary: "这篇博客主要总结了笔者对于C++中一些与值、引用有关的优化和使用方法。"
---

## 移动语义

C++11中引入了移动语义也即移动构造函数，主要的目的是避免不必要的拷贝。移动这一概念相对来说比较好理解，因为一个类型的实例是由其成员构成的，构造一个对象实际上就是对对象的成员进行初始化操作。所以移动就可以理解为把一个对象所拥有的成员移动给另一个对象。在Rust这种一开始就表明所有权这一概念的语言中，移动其实将对象成员的所有权转移给另一个对象。

我们知道拷贝构造函数接受的是const引用：

- 为什么用const修饰？因为拷贝这一个行为在语义上蕴含着这一操作不应该修改被拷贝的对象
- 为什么是引用？因为如果不是引用就会导致递归的拷贝构造

```c++
class A {
public:
   A();
   // copy constructor
   A(const A& other);
   // copy assign operator
   A& operator=(const A& obj);
private:
   int a;
   int *array_;
}；
```

那么移动构造函数应该接受什么作为参数呢？这就必须要引入左值引用和右值引用这组概念了，那么什么是左值？什么是右值呢？

## 左值、右值

其实用 **值(value)** 这个词来描述是不准确的，严格来说是表达式，为什么不严格来说呢？我猜可能是约定俗成吧（C++中就是有很多的不严谨的术语，习惯就好）。在C++里面，一个表达式要么是左值，要么是右值。

左值lvalue的这个左是怎么来的呢，主要是相对于赋值运算符=来说的。

```c++
lvalue = rvalue
```

左值顾名思义就是赋值号=左边的值，右值就是右边的值。当然，这种表达是不准确的。

严格来说，左值是在**内存**中占有一个位置的表达式，换句话说就是，我们可以获得左值的地址。

而右值就是反过来：右值是没法获取其在内存中地址的表达式，当然也就没法修改它（认识到这一点这很重要）。

## 左值引用、右值引用

右值引用是随着移动语义这个概念在C++11中提出来的，我们都知道引用其实就是一种对某个对象的绑定Binding：

- 左值引用就是只能绑定到左值上的引用，形式上表现为`T& x_lref = x;`（假设`x`已经在之前定义过）
- 右值引用就是只能绑定到右值上的引用，形式上表现为`T&& x_rref = T{};`

```c++
int x = 5;
int& x_lref = x; // ok
int&& x_rref = x; // compile error

int y = 6;
int& product_lref = (x * y); // compile error
int&& product_rref = (x * y); // ok
```

当考虑到`const`的时候，情况发生了变化。从语义上看，`const`就是不可变的意思，而我们在使用非`const`的左值引用的时候通常就是需要修改这个引用所绑定的对象的时候，所以，`const`修饰左值引用的时候就是向编译器承诺，我们不会修改这个引用所绑定的对象，这满足右值的语义（右值无法修改），因而`const`左值引用既可以绑定到左值上，也可以绑定到右值上。

```c++
const int& product_const_lref = (x * y); // ok
```

当左值引用、右值引用和`const`左值引用作为形参类型的时候也是一样的：

```c++
class A {};

void f(A&) {}
void g(const A&) {}
void h(A&&) {}

int main() {
   A a;
   f(a); // ok
   g(a); // ok
   h(a); // compile error

   f(A{}); // compile error
   g(A{}); // ok
   h(A{}); // ok
   return 0;
}
```

## 移动构造函数

了解完右值引用之后我们发现，移动这一语义和右值引用的语义不谋而合（不能修改被移动对象的内容），移动构造函数便可以声明为：

```c++
class A {
public:
   A();
   // copy constructor
   A(const A& other);
   // copy assign operator
   A& operator=(const A& other);
   // move constructor
   A(A&& other)；
   // move assign operator
   A& operator=(A && other);
private:
   int a;
   int *array_;
}；
```

移动构造函数做了什么呢？如前所述，移动这一行为就是把被移动对象other的成员转移给当前对象，所以：

1. 递归浅拷贝other的每个成员给this的每个成员
2. 释放other的所有成员

而移动复制运算符就是：

1. 释放this的每个成员
2. 递归浅拷贝other的每个成员给a的每个成员
3. 释放other的所有成员
4. 返回this指针

以上面的`class A`为例：

```c++
A(A&& other) {
   a = other.a;
   array_ = other.array_;
   other.a = 0;
   other.array_ = nullptr;
}

A& operator=(A&& other) {
   delete []array_;
   a = other.a;
   array_ = other.array_;
   other.a = 0;
   other.array_ = nullptr;
   return *this;
}
```

如果一个类需要拷贝构造函数，那么它一般也需要移动构造函数。反过来，如果一个类需要移动构造函数，但是不一定需要拷贝构造函数。比如`std::unique_ptr`只允许移动语义而不允许拷贝语义。（更能理解为什么rust里面默认就是移动，而不是拷贝）

因为默认的移动构造函数并不会进行资源的释放，那么对于拥有在堆上成员的类来说，使用移动构造会造成内存泄漏或者重复释放。具体来说，当我们不定义析构函数时会内存泄漏，定义析构函数但不定义移动构造函数时会重复释放。

```c++
#include <utility>

class A {
  public:
    A() = default;

    A(int a) : a(a), array(new int[a]) {}

  private:
    int a;
    int *array;
};

int main(int argc, char *argv[]) {
    A a{10};
    A b{std::move(a)};
    return 0;
}
```

![默认析构造成内存泄漏](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20240429001550851.png)

因为默认析构函数不会释放动态分配的内存，所以可以看到泄露了`sizeof(int) * 10 = 40Byte`的内存。

那加上析构函数之后呢？

```c++
#include <utility>

class A {
  public:
    A() = default;

    A(int a) : a(a), array(new int[a]) {}
	// destructor
    ~A() {
        delete[] array;
        a = 0;
    }

  private:
    int a;
    int *array;
};

int main(int argc, char *argv[]) {
    A a{10};
    A b{std::move(a)};
    return 0;
}
```

![image-20240429002210606](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20240429002210606.png)

因为默认移动构造函数不会将`array`置为`nullptr`，所以当析构两个栈上对象时会对同一块内存重复释放。

所以正确版本应该是：

```c++
#include <utility>

class A {
  public:
    A() = default;

    A(int a) : a(a), array(new int[a]) {}
	// move constructor
    A(A &&other) {
        a = other.a;
        array = other.array;
        // make other.array to nullptr, avoid re-release
        other.array = nullptr;
        other.a = 0;
    }
	// destructor
    ~A() {
        delete[] array;
        a = 0;
    }

  private:
    int a;
    int *array;
};

int main(int argc, char *argv[]) {
    A a{10};
    A b{std::move(a)};
    return 0;
}
```

![image-20240429003254819](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20240429003254819.png)

## std::move

`std::move()`在`<utility>`中定义，其作用很简单：就是明确地告诉编译器，需要调用形参是右值版本的函数重载

```c++
#include <vector>

int main() {
   std::vector<A> vec;
   vec.push_back(A{});              // rvalue version push_back
   A obj;
   vec.push_back(obj);              // lvalue version push_back
   vec.push_back(std::move(obj));   // rvalue version push_back
}
```

未完待续~
