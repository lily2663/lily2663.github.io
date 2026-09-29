---
title: "JavaScript_event_loop"
date: "2026-07-12"
lastmod: "2026-07-12T00:00:00+08:00"
slug: "js-event-loop"
summary: ""
tags:
  - "JavaScript"
  - "原理"
params:
  protected: false
  commentId: "js-event-loop"
  legacyId: "js-event-loop"
cover: ""
draft: true
---
## 单线程与任务队列

JavaScript 是单线程的，但浏览器通过**事件循环（Event Loop）**让异步代码得以调度执行。

一次事件循环会依次处理：

1. 执行当前**宏任务**（如 script 整体、setTimeout 回调）
2. 清空所有**微任务**（如 Promise.then、queueMicrotask）
3. 渲染（如果需要）
4. 取下一个宏任务，重复

## 一个经典例子

```js
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve()
  .then(() => console.log('3'))
  .then(() => console.log('4'));

console.log('5');
```

输出顺序是：`1 5 3 4 2`。

原因：`setTimeout` 是宏任务，排在微任务之后；两个 `then` 在微任务队列里被连续清空。

> 记住一句话：**微任务永远比下一个宏任务先跑。**

## 实际影响

在做动画、批量 DOM 更新或防抖节流时，理解这个机制能帮你避开「卡顿」和「时序错乱」的坑。
