---
title: "WebRTC任务队列学习笔记"
date: 2024-03-19T19:32:57+08:00
draft: false
math: true
keywords: ["WebRTC", "thread", "task"]
tags: ["WebRTC"]
categories: ["development"]
url: "posts/development/webrtc-task-queue"
---

## TaskQueue

`TaskQueue`也即任务队列，不过这个类本身并没有与队列相关的任何代码，所以它是用来干什么的呢？

我们直接来读代码（为了方便，我这里直接把方法的实现代码贴了出来）：

```c++
class RTC_LOCKABLE RTC_EXPORT TaskQueue {
 public:
  // TaskQueue priority levels. On some platforms these will map to thread
  // priorities, on others such as Mac and iOS, GCD queue priorities.
  using Priority = ::webrtc::TaskQueueFactory::Priority;

  explicit TaskQueue(std::unique_ptr<webrtc::TaskQueueBase,
                                     webrtc::TaskQueueDeleter> task_queue)
      : impl_(task_queue.release()) {}

  ~TaskQueue() {
      impl_->Delete();
  }

  // Used for DCHECKing the current queue.
  bool IsCurrent() const {
      impl_->IsCurrent();
  }

  // Returns non-owning pointer to the task queue implementation.
  webrtc::TaskQueueBase* Get() { return impl_; }

  // TODO(tommi): For better debuggability, implement RTC_FROM_HERE.

  // Ownership of the task is passed to PostTask.
  void PostTask(std::unique_ptr<webrtc::QueuedTask> task) {
      return impl_->PostTask(std::move(task));
  }

  // Schedules a task to execute a specified number of milliseconds from when
  // the call is made. The precision should be considered as "best effort"
  // and in some cases, such as on Windows when all high precision timers have
  // been used up, can be off by as much as 15 millseconds (although 8 would be
  // more likely). This can be mitigated by limiting the use of delayed tasks.
  void PostDelayedTask(std::unique_ptr<webrtc::QueuedTask> task,
                       uint32_t milliseconds) {
      return impl_->PostDelayedTask(std::move(task), milliseconds);
  }

  // std::enable_if is used here to make sure that calls to PostTask() with
  // std::unique_ptr<SomeClassDerivedFromQueuedTask> would not end up being
  // caught by this template.
  template <class Closure,
            typename std::enable_if<!std::is_convertible<
                Closure,
                std::unique_ptr<webrtc::QueuedTask>>::value>::type* = nullptr>
  void PostTask(Closure&& closure) {
    PostTask(webrtc::ToQueuedTask(std::forward<Closure>(closure)));
  }

  // See documentation above for performance expectations.
  template <class Closure,
            typename std::enable_if<!std::is_convertible<
                Closure,
                std::unique_ptr<webrtc::QueuedTask>>::value>::type* = nullptr>
  void PostDelayedTask(Closure&& closure, uint32_t milliseconds) {
    PostDelayedTask(webrtc::ToQueuedTask(std::forward<Closure>(closure)),
                    milliseconds);
  }

 private:
  webrtc::TaskQueueBase* const impl_;

  RTC_DISALLOW_COPY_AND_ASSIGN(TaskQueue);
};
```

`private`部分：

`TaskQueue`只有一个私有变量，也就是使用`TaskQueueBase`的裸指针指向的常量`impl_`，并且`TaskQueue`禁用了拷贝构造函数和赋值运算符。

这里为什么存放的是裸指针呢，我猜主要是出于性能的考虑。

`public`部分：

`TaskQueue`的构造函数接受1个参数，也就是使用`unique_ptr`管理生命周期的对象，这个对象需要是实现了`TaskQueueBase`这一接口的对象。

`TaskQueue`有 2 个重要的方法，也就是`PostTask`和`PostDelayedTask`。

+ `PostTask`：将`task`加入到任务队列中进行即时处理；
+ `PostDelayedTask`：将`task`加入到任务队列中，过`milliseconds`毫秒处理。

这 2 种方法都有 2 种重载形式。在webrtc的代码中，经常使用的是接受一个闭包也就是lambda表达式作为参数的这一重载形式。

比如在`call/rtp_transport_controller_send.cc`中：

```c++
void RtpTransportControllerSend::OnSentPacket(
    const rtc::SentPacket& sent_packet) {
  task_queue_.PostTask([this, sent_packet]() {
    RTC_DCHECK_RUN_ON(&task_queue_);
    absl::optional<SentPacket> packet_msg =
        transport_feedback_adapter_.ProcessSentPacket(sent_packet);
    pacer()->UpdateOutstandingData(
        transport_feedback_adapter_.GetOutstandingData());
    if (packet_msg && controller_)
      PostUpdates(controller_->OnSentPacket(*packet_msg));
  });
}

void RtpTransportControllerSend::OnReceivedPacket(
    const ReceivedPacket& packet_msg) {
  task_queue_.PostTask([this, packet_msg]() {
    RTC_DCHECK_RUN_ON(&task_queue_);
    if (controller_)
      PostUpdates(controller_->OnReceivedPacket(packet_msg));
  });
}
```

`TaskQueue`的创建基本上都是采用工厂模式完成。

从`TaskQueue`的实现代码中可以发现，它其实只是为实现了`TaskQueueBase`这一接口类的子类封装了一个统一的调用接口，实际上起到的是代理的作用。

真正做事的或者说真正核心的代码应该是`TaskQueueBase`这个接口类的定义以及实现其纯虚函数的子类。

## TaskQueueBase

`TaskQueueBase`是WebRTC中用来实现异步执行任务的类，保证队列中的任务按照FIFO的顺序执行，不同任务的执行时间不会重叠。

不过，同一个任务队列中的不同任务并不一定总是在相同的worker线程上执行。

```c++
class RTC_LOCKABLE RTC_EXPORT TaskQueueBase {
 public:
  // Starts destruction of the task queue.
  // On return ensures no task are running and no new tasks are able to start
  // on the task queue.
  // Responsible for deallocation. Deallocation may happen syncrhoniously during
  // Delete or asynchronously after Delete returns.
  // Code not running on the TaskQueue should not make any assumption when
  // TaskQueue is deallocated and thus should not call any methods after Delete.
  // Code running on the TaskQueue should not call Delete, but can assume
  // TaskQueue still exists and may call other methods, e.g. PostTask.
  virtual void Delete() = 0;

  // Schedules a task to execute. Tasks are executed in FIFO order.
  // If |task->Run()| returns true, task is deleted on the task queue
  // before next QueuedTask starts executing.
  // When a TaskQueue is deleted, pending tasks will not be executed but they
  // will be deleted. The deletion of tasks may happen synchronously on the
  // TaskQueue or it may happen asynchronously after TaskQueue is deleted.
  // This may vary from one implementation to the next so assumptions about
  // lifetimes of pending tasks should not be made.
  virtual void PostTask(std::unique_ptr<QueuedTask> task) = 0;

  // Schedules a task to execute a specified number of milliseconds from when
  // the call is made. The precision should be considered as "best effort"
  // and in some cases, such as on Windows when all high precision timers have
  // been used up, can be off by as much as 15 millseconds.
  virtual void PostDelayedTask(std::unique_ptr<QueuedTask> task,
                               uint32_t milliseconds) = 0;

  // Returns the task queue that is running the current thread.
  // Returns nullptr if this thread is not associated with any task queue.
  static TaskQueueBase* Current() {
      return current;
  }
  bool IsCurrent() const { return Current() == this; }

 protected:
  class CurrentTaskQueueSetter {
   public:
    ABSL_CONST_INIT thread_local TaskQueueBase* current = nullptr;

    explicit CurrentTaskQueueSetter(TaskQueueBase* task_queue) : previous_(current) {
        current = task_queue;
    }

    ~CurrentTaskQueueSetter() {
        current = previous_;
    }

	CurrentTaskQueueSetter(const CurrentTaskQueueSetter&) = delete;
    CurrentTaskQueueSetter& operator=(const CurrentTaskQueueSetter&) = delete;

   private:
    TaskQueueBase* const previous_;
  };

  // Users of the TaskQueue should call Delete instead of directly deleting
  // this object.
  virtual ~TaskQueueBase() = default;
};
```

从代码中的注释可以看明白`PostTask`这一方法的作用，也就是我们上面所说的：把`task`加入到事件队列中，按照FIFO的顺序进行处理。

需要注意的是，这里还有一个可访问性为`protected`的类：`CurrentTaskQueueSetter`，这个类的作用就像它的命名一样，用于设置当前的任务队列，也就是把任务队列绑定到当前线程上。

+ 构造时，用传入构造函数的任务队列更新当前线程存放的任务队列，并将更新前的任务队列暂存到当前线程的TLS(Thread Local Storage)中。
+ 析构时，用构造时暂存的任务队列更新当前线程存放的任务队列。

WebRTC中有好几个实现了`TaskQueueBase`这一接口的类如`TaskQueueStdlib`, `TaskQueueLibevent`, `TaskQueueWin`, `SimulatedTaskQueue`等，它们的作用也各不相同。

下面我们以`TaskQueueStdlib`为例，对实际的`PostTask`等函数是如何运行的一探究竟。

## TaskQueueStdlib

