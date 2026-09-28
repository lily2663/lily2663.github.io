---
title: "wsl2镜像网络模式配置"
date: "2026-09-14"
lastmod: 2026-09-14T13:52:53.882Z
slug: "wsl2镜像网络模式配置"
summary: "终于修改了这些东西"
tags:
  - "linux"
categories: []
draft: false
cover: ""
params:
  protected: false
---

## 理由

VPS到期了，想要让自己的wsl成为真正的攻击机（可以实现反弹shell等等操作如同是win物理机一般），以及可以让靶机不再因为win和wsl不同配置文件而隔离，于是打算采取桥接网络取代wsl2的默认nat模式，but，（现在 bridged`已经被微软明确标记为 **deprecated**，自 WSL 2.4.5 起就是弃用模式）采取了如文章标题所言的：镜像网络模式（当然internet题目依旧是vps最好）

![1789389296023](/assets/img/typora/1789389296023.png)

### nat模式为什么让我抓狂？

ip嵌套分配：当采取nat模式时，kali会被分配一个

```
172.x.x.x
```

尽管此时确实可以正常进行nmap和下载/上传数据包

but当我遇到一个靶机：

1.反弹shell会失败（NAT 模式下 WSL 位于独立的虚拟私有网段，远端靶机通常无法直接路由到 WSL 的 `172.x.x.x` 地址，因此直接将该地址作为 reverse shell 的回连地址时可能失败）

2.当这台靶机的某个服务绑定了域名解析，写入/etc/hosts后只能在kex中看到这个服务的真面目，win上依旧无法访问

这些问题当然都可以解决，但是如何一劳永逸呢？

## 配置

首先看最初我的%UserProfile%\.wslconfig

```bash
[wsl2]
memory=8GB
swap=4GB
localhostForwarding=true
```

效果大致是：

![1789390798167](/assets/img/typora/1789390798167.png)

此时的win和wsl是两个网络空间

而mirror做的事情：

**把 Windows 主机的网络接口镜像进 WSL 的网络环境**

![1789390882090](/assets/img/typora/1789390882090.png)

为了达到这种效果：

首先是：

#### 1.开启镜像模式

```bash
networkingMode=mirrored
```

**优化**

#### 2.DNS Tunnelin

```bash
dnsTunneling=true
```

对于传统wsl-dns，总是类似于：

```bash
Linux
 │
 ▼
/etc/resolv.conf
 │
 ▼
某个虚拟 DNS
 │
 ▼
Windows / VPN / LAN DNS
```

此时可能会发生win能正常解析，wsl不能的情况

而此时的dnsTunneling可以实现

```bash
WSL DNS Query
       │
       │ virtualization channel
       ▼
Windows DNS Client
       │
       ├── Windows DNS
       ├── VPN DNS
       ├── DNS suffix
       ├── NRPT
       └── hosts policy
```

并且针对于域名绑定规则：DNS tunneling 启用后，generateHosts甚至会被忽略；Windows hosts 没有被物理复制到 /etc/hosts，相关策略会应用于 Linux DNS 查询，最后实现只改一端，应用两端

（因此可以将 Windows hosts 作为主要的域名映射配置源：Windows 自身可以读取，WSL 中通过正常 DNS/NSS 解析发起的查询也能够应用这些规则。需要注意，这并不是 Windows 与 Linux 双向同步 hosts；Linux /etc/hosts 中单独添加的内容不会反向同步给 Windows）

#### 3.autoProxy

```bash
autoProxy=true   //(默认开启)
```

我的win长期开启代理

于是这个autoProxy=true会让 WSL 使用 Windows HTTP Proxy 信息

#### 4.hostAddressLoopback

```bash
hostAddressLoopback=true
```

当开启后：

允许 Windows / WSL 使用分配给 Windows 主机的 IPv4 地址相互访问

于是可以同时使用：

```
localhost
真实 LAN 地址
```

#### 5.firewall

```bash
firewall=true  //默认值
```

最后的配置：

```bash
[wsl2]
memory=8GB
swap=4GB
networkingMode=mirrored
dnsTunneling=true
autoProxy=true

[experimental]
hostAddressLoopback=true
```

然后

```bash
wsl --shutdown
```

最后：

```bash
kali
```

补：

## 防火墙规则设置

### 开启 
(实测影响不大)

```powershell
Get-NetFirewallHyperVVMSetting `
  -PolicyStore ActiveStore `
  -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}'
```

会返回：

```powershell
Name                  : {40E0AC32-46A5-438A-A0B2-2B479E8F2E90}
Enabled               : True
DefaultInboundAction  : Block   //问题所在
DefaultOutboundAction : Allow   //WSL 主动访问外部没问题
LoopbackEnabled       : True   //Windows ↔ WSL loopback 正常
AllowHostPolicyMerge  : True
```

开启

```powershell
PS C:\Users\lilyzero207> Set-NetFirewallHyperVVMSetting `
>>   -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' `
>>   -DefaultInboundAction Allow
PS C:\Users\lilyzero207> Get-NetFirewallHyperVVMSetting `
>>   -PolicyStore ActiveStore `
>>   -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}'


Name                  : {40E0AC32-46A5-438A-A0B2-2B479E8F2E90}
Enabled               : True
DefaultInboundAction  : Allow
DefaultOutboundAction : Allow
LoopbackEnabled       : True
AllowHostPolicyMerge  : True

```

### 测试环节

#### 1.localhost 通道打通

kali

```bash
python3 -m http.server 8000 --bind 0.0.0.0   //0.0.0.0 是服务端的监听地址，表示监听全部 IPv4 接口
```

win

```bash
curl.exe http://localhost:8000/
```

or

```bash
curl.exe http://127.0.0.1:8000/
```

or

```bash
curl.exe http://192.168.31.85:8000/
```

结果完全一致

#### 2.同一局域网下另一设备的连接测试

手机/电脑等设备直接访问：

```bash
http://192.168.31.85:8000/
```

若结果一致，成功

### 关闭

```powershell
Set-NetFirewallHyperVVMSetting `
  -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' `
  -DefaultInboundAction Block
```

