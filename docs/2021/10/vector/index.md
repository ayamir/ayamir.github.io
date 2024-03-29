# 重学 C++：标准库类模板 Vector


## 常见的坑

1. `vector`的默认初始化是否合法取决于`vector`内对象所属的类是否要求显式初始化。

2. 使用`()`和`{}`对`vector`执行初始化含义不同。

   ```C++
   using std::vector;
   
   vector<int> v1{10};    // 存储1个int对象，值为10
   vector<int> v2(10);    // 存储10个int对象，值为0
   
   vector<int> v3(10, 1); // 存储10个int对象，值都是1
   vector<int> v4{10, 1}; // 存储2个int对象，值分别是10和1
   ```

3. 使用`{}`执行列表初始化时按照顺序遵守 2 个守则：

   1. 如果`{}`内容可以用于初始化，则采用`{}`默认的初始化含义。

   2. 如果`{}`中的内容无法用`{}`默认的初始化含义做出解释，则会按照`()`的初始化含义去解释`{}`。

      ```C++
      using std::vector;
      using std::string;
      
      vector<string> v1{"hi"};      // 存储1个值为hi的string对象
      vector<string> v2{10};        // 存储10个值为空的string对象
      vector<string> v3{10, "hi"};  // 存储10个值为hi的string对象
      ```

4. 与`string`相同，`vector`也有`size_type`作为其`size()`的返回值类型。

   但是使用时必须首先指定`vector`由哪个类型定义。

   ```C++
   std::vector<int>::size_type a; // 正确
   std::vector::size_type a;      // 错误
   ```

5. 只有`vector`内元素的类型可以被比较时才能做比较运算，对于自定义类型需要手动定义运算符重载。

6. 增加`vector`中的元素只能使用`push_back()`，而不能使用对下标赋值的方式。

## 必须理解的点

1. `vector`是类模板而非类型。
2. `vector`中只能容纳对象，不能容纳引用。
3. `vector`对象能高效增长，增加`vector`中的元素需要使用`push_back()`成员函数。
4. `vector`的成员函数（`empty()`, `size()`）和各种运算符（赋值、关系、下标）的操作使用方法和规则基本同`string`。

## 建议

1. 不需要在创建`vector`时确定其中的元素及其大小。
2. 在循环体内部包含向`vector`对象添加元素的操作时，不应该使用`foreach`循环。

