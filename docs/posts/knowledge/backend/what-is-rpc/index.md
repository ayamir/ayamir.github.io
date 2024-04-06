# 什么是 RPC ？


## 是什么

RPC 全名即 Remote Procedure Call：远程过程调用，本质上是一种设计/概念，它允许在一台机器上的 Client 调用运行在另一台机器上的 Server 上的程序接口。

## 为什么

RPC 的出现主要是为了满足现实世界中多机集群的业务分离， Client 端的业务和 Server 端的业务相互分离，目的是更强的性能、可扩展性和可维护性。

RPC 在我看来就是传统的前后端 http RESTful 框架的更加 general 的版本，两者在思想上是一致的，只不过 RESTful 框架是把现实业务中的 **前端的显示** 和 **后端的数据处理** 进行分离，而 RPC 则是更为通用的一种考虑，只要项目的设计者认为某个功能使用 RPC 进行分离会带来如性能、可靠性、可维护性等非功能特性上的收益，那其实就可以引入 RPC 。RPC 能完成的功能性需求不使用 RPC 一般来说也能实现，RPC 的收益主要体现在非功能性需求上。

## 怎么做

RPC 的核心是面向接口编程的思想，Server 端和 Client 端可以通过定义好语言无关的接口（函数签名），双方的过程调用就可以像调用同一文件中的不同函数一样进行。

既然涉及到了不同主机，那么不可避免地会引入网络通信，而网络通信的本质其实就是需要规定好：消息如何编解码（或者说如何序列化和反序列化）、消息如何通过网络传输。

因而 RPC 在实现上主要需要考虑两部分，第一个部分是**通信协议**，第二部分是**编码协议**，

- 通信协议：HTTP/TCP/UDP
- 编码协议：xml/json/protobuf

目前主流的 RPC 框架在编码协议上基本上都使用 protobuf ，因为 protobuf 作为一种二进制数据可以带来比 xml/json 这种文本数据更高的压缩效率（当然，更加重要的前提条件是 RPC 传输的消息其实不太需要跟人打交道，也就无需可读性）。

对于通信协议，不同的 RPC 框架可能根据自己的用途有着不同的选择，比如 gRPC 使用的是 HTTP/2，而 tRPC 则根据不同的传输形式（unary和stream）设计了不同的自定义的协议格式。

## 实际操作

以 tRPC 的 helloworld 为例，首先需要做的是写 IDL(Interface Defined Language) ，也就是前面提到的 `proto` 文件：

```proto
service Greeter {
  rpc Hello (HelloRequest) returns (HelloReply) {}
}

message HelloRequest {
  string msg = 1;
}

message HelloReply {
  string msg = 1;
}
```

这里首先定义了一个名为 `Greeter` 的服务，服务包含一个名为 `Hello` 的函数，其入参为 `HelloRequest` ，出参为 `HelloReply`。

后面则定义了 `HelloRequest` 和 `HelloReply` 这两种消息的格式，需要注意的是这里的 `string msg = 1` 并不是将 `msg` 初始化为 1 的意思（当然，`string` 类型的数据就算要初始化也应该是 `"1"` 而不是 `1`），而是说 `msg` 这个成员是 `HelloReply` 和 `HelloRequest` 的第 `1` 个成员。

之后可以使用 tRPC 的命令行工具或者是 `Makefile` 来生成相应的桩代码，供实现实现逻辑的客户端和服务端代码进行调用。

这里体现的其实就是前面所说的，RPC 只是一种对原本功能的一种分离，通过 IDL 确定好 C-S 之间的接口之后，C-S 都只需要调用协商好的接口，而原来的业务逻辑该怎么实现就怎么实现。

