# 重学C++：类型推导


## 常见的坑

1. `auto`可以在一条语句中声明多个变量，但是所有变量的类型必须一致。

2. `decltype`在分析表达式类型时并不执行表达式。

3. `decltype`处理解引用操作之后返回的是引用类型，而引用类型的变量必须初始化。

4. `decltype((variable))`的结果永远是引用。

   `decltype(variable)`的结果只有当`variable`是引用时才是引用。

## 必须要理解的点

1. `auto`用于变量初始化时的类型推导，`decltype`用于分析表达式的类型。
2. `auto`对引用类型推导时实际上用的是引用对象的值。
3. `auto`与`const`：详见[重学C++：Const二三事](https://ayamir.github.io/posts/const/)。
4. `decltype`与`const`：详见[重学C++：Const二三事](https://ayamir.github.io/posts/const/)。

## 建议

1. `auto`尽量只在类型较长但比较清晰时使用。
2. `decltype`尽量不要使用。

