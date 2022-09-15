---
title: "重学C++：标准库类型string"
date: 2021-10-28T10:31:33+08:00
draft: false
math: true
keywords: ["C++"]
tags: ["C++"]
categories: ["Tech"]
---



## 常见的坑

1. `string.size()`和`string.length()`等价。

   `string.size()`和其他`STL`容器的命名风格相一致（如`vector`, `map`）。

   `string.length()`出现主要是因为这样的命名符合人的直觉，有更好的可读性。

2. `string::size_type`是无符号类型，和`int`不同，能存放下任何`string`对象的大小。

3. `+`两边至少有一端需要是`string`对象，不允许两个字符串字面量单独相加。

   ```C++
   using std::string;
   string a = "a";
   string b = a + "b" + "c";   // 正确，从左到右运算时能保证至少一段是string对象
   string c = "b" + "c" + a;   // 错误，从左到右运算时第一个+左右都是字符串字面量
   ```

## 必须要理解的点

1. `string`的初始化方式有两种，一种是默认初始化，另一种是拷贝初始化。

2. `string.size()`返回值类型为`string::size_type`，出现这种类型是为了体现标准库类型和机器无关的特性。

3. `string`对象的比较运算完全实现了运算符重载（`==`, `!=`, `<`,`<=`, `>`, `>=`）。

   `==`表明两个对象的内容和长度完全一致，反之任一不同则`!=`。

   不等关系运算符比较的法则：

   1. 如果两个对象长度不同，但是从前到后内容一致，则长度较短的对象较小。
   2. 如果两个对象从前到后有对应位置的字符不同，则这个位置的两个字符的大小关系就是两个对象的大小关系。

4. `string`对象赋值操作就是内容的替换。

5. `string`对象相加操作就是内容的拼接，`+=`操作同理。

6. `string`对象可以与字符串字面量相加。

7. 形如`cname`的`C++`头文件兼容形如`ctype.h`的`C`头文件，`C++`头文件中定义的名字可以在`std`中找到。

## 建议

1. 表达式中出现`string.size()`函数时就不应该使用`int`类型，这样可以避免`int`和`unsigned`混用的问题。

2. `C++`和`C`兼容的头文件作选择时，选择`C++`的头文件。

3. 处理`string`对象中每一个字符时，使用`foreach`语句。

   ```C++
   #include <iostream>
   #include <cctype>
   
   using std::string;
   
   string str{"Some String"};
   for (auto c : str) {
       std::cout << c << std::endl;
   }
   
   // 使用引用来改变原字符串内容
   for (auto &c : str) {
       c = std::toupper(c);
   }
   std::cout << str << std::endl;
   ```

4. 处理`string`对象中特定字符时使用`[]`（下标运算符）或者迭代器。

   使用`[]`访问字符之前检查`string`对象是否为空。

   ```C++
   std::string s = "a";
   if (!s.empty()) {
       std::cout << s[0] << std::endl;
   }
   ```

5. `string`对象下标使用`string::size_type`作为类型而非`int`。

   ```C++
   using std::string;
   
   string a = "Hello, world!";
   string::size_type index_of_space = a.find(" ");
   ```

   

