---
title: "HTTP"
date: "2025-09-16"
lastmod: 2026-09-16T14:08:57.730Z
slug: "http"
summary: ""
tags:
  - "http"
categories: []
draft: true
cover: ""
params:
  protected: false
---

# HTTP

#### 1.XFF

是用来识别通过HTTP代理或负载均衡方式连接到Web服务器的客户端最原始的IP地址的HTTP请求头字段。

也就是说，我们需要借助**X-Forwaeded-For**来伪装我们的IP为127.0.0.1

#### 2.post方式编码

POST参数一般都需要通过 Content-Type 请求头指定编码，否则大部分的服务器都不会进行解析。一般我们使用
Content-Type: application/x-www-form-urlencoded
此编码代表使用表单格式，内容url编码

Content-Type: application/json

#### 3.HTTPcontent-type对照表

| 文件扩展名                          | Content-Type(Mime-Type)                 | 文件扩展名 | Content-Type(Mime-Type)             |
| ----------------------------------- | --------------------------------------- | ---------- | ----------------------------------- |
| .*（ 二进制流，不知道下载文件类型） | application/octet-stream                | .tif       | image/tiff                          |
| .001                                | application/x-001                       | .301       | application/x-301                   |
| .323                                | text/h323                               | .906       | application/x-906                   |
| .907                                | drawing/907                             | .a11       | application/x-a11                   |
| .acp                                | audio/x-mei-aac                         | .ai        | application/postscript              |
| .aif                                | audio/aiff                              | .aifc      | audio/aiff                          |
| .aiff                               | audio/aiff                              | .anv       | application/x-anv                   |
| .asa                                | text/asa                                | .asf       | video/x-ms-asf                      |
| .asp                                | text/asp                                | .asx       | video/x-ms-asf                      |
| .au                                 | audio/basic                             | .avi       | video/avi                           |
| .awf                                | application/vnd.adobe.workflow          | .biz       | text/xml                            |
| .bmp                                | application/x-bmp                       | .bot       | application/x-bot                   |
| .c4t                                | application/x-c4t                       | .c90       | application/x-c90                   |
| .cal                                | application/x-cals                      | .cat       | application/vnd.ms-pki.seccat       |
| .cdf                                | application/x-netcdf                    | .cdr       | application/x-cdr                   |
| .cel                                | application/x-cel                       | .cer       | application/x-x509-ca-cert          |
| .cg4                                | application/x-g4                        | .cgm       | application/x-cgm                   |
| .cit                                | application/x-cit                       | .class     | java/*                              |
| .cml                                | text/xml                                | .cmp       | application/x-cmp                   |
| .cmx                                | application/x-cmx                       | .cot       | application/x-cot                   |
| .crl                                | application/pkix-crl                    | .crt       | application/x-x509-ca-cert          |
| .csi                                | application/x-csi                       | .css       | text/css                            |
| .cut                                | application/x-cut                       | .dbf       | application/x-dbf                   |
| .dbm                                | application/x-dbm                       | .dbx       | application/x-dbx                   |
| .dcd                                | text/xml                                | .dcx       | application/x-dcx                   |
| .der                                | application/x-x509-ca-cert              | .dgn       | application/x-dgn                   |
| .dib                                | application/x-dib                       | .dll       | application/x-msdownload            |
| .doc                                | application/msword                      | .dot       | application/msword                  |
| .drw                                | application/x-drw                       | .dtd       | text/xml                            |
| .dwf                                | Model/vnd.dwf                           | .dwf       | application/x-dwf                   |
| .dwg                                | application/x-dwg                       | .dxb       | application/x-dxb                   |
| .dxf                                | application/x-dxf                       | .edn       | application/vnd.adobe.edn           |
| .emf                                | application/x-emf                       | .eml       | message/rfc822                      |
| .ent                                | text/xml                                | .epi       | application/x-epi                   |
| .eps                                | application/x-ps                        | .eps       | application/postscript              |
| .etd                                | application/x-ebx                       | .exe       | application/x-msdownload            |
| .fax                                | image/fax                               | .fdf       | application/vnd.fdf                 |
| .fif                                | application/fractals                    | .fo        | text/xml                            |
| .frm                                | application/x-frm                       | .g4        | application/x-g4                    |
| .gbr                                | application/x-gbr                       | .          | application/x-                      |
| .gif                                | image/gif                               | .gl2       | application/x-gl2                   |
| .gp4                                | application/x-gp4                       | .hgl       | application/x-hgl                   |
| .hmr                                | application/x-hmr                       | .hpg       | application/x-hpgl                  |
| .hpl                                | application/x-hpl                       | .hqx       | application/mac-binhex40            |
| .hrf                                | application/x-hrf                       | .hta       | application/hta                     |
| .htc                                | text/x-component                        | .htm       | text/html                           |
| .html                               | text/html                               | .htt       | text/webviewhtml                    |
| .htx                                | text/html                               | .icb       | application/x-icb                   |
| .ico                                | image/x-icon                            | .ico       | application/x-ico                   |
| .iff                                | application/x-iff                       | .ig4       | application/x-g4                    |
| .igs                                | application/x-igs                       | .iii       | application/x-iphone                |
| .img                                | application/x-img                       | .ins       | application/x-internet-signup       |
| .isp                                | application/x-internet-signup           | .IVF       | video/x-ivf                         |
| .java                               | java/*                                  | .jfif      | image/jpeg                          |
| .jpe                                | image/jpeg                              | .jpe       | application/x-jpe                   |
| .jpeg                               | image/jpeg                              | .jpg       | image/jpeg                          |
| .jpg                                | application/x-jpg                       | .js        | application/x-javascript            |
| .jsp                                | text/html                               | .la1       | audio/x-liquid-file                 |
| .lar                                | application/x-laplayer-reg              | .latex     | application/x-latex                 |
| .lavs                               | audio/x-liquid-secure                   | .lbm       | application/x-lbm                   |
| .lmsff                              | audio/x-la-lms                          | .ls        | application/x-javascript            |
| .ltr                                | application/x-ltr                       | .m1v       | video/x-mpeg                        |
| .m2v                                | video/x-mpeg                            | .m3u       | audio/mpegurl                       |
| .m4e                                | video/mpeg4                             | .mac       | application/x-mac                   |
| .man                                | application/x-troff-man                 | .math      | text/xml                            |
| .mdb                                | application/msaccess                    | .mdb       | application/x-mdb                   |
| .mfp                                | application/x-shockwave-flash           | .mht       | message/rfc822                      |
| .mhtml                              | message/rfc822                          | .mi        | application/x-mi                    |
| .mid                                | audio/mid                               | .midi      | audio/mid                           |
| .mil                                | application/x-mil                       | .mml       | text/xml                            |
| .mnd                                | audio/x-musicnet-download               | .mns       | audio/x-musicnet-stream             |
| .mocha                              | application/x-javascript                | .movie     | video/x-sgi-movie                   |
| .mp1                                | audio/mp1                               | .mp2       | audio/mp2                           |
| .mp2v                               | video/mpeg                              | .mp3       | audio/mp3                           |
| .mp4                                | video/mpeg4                             | .mpa       | video/x-mpg                         |
| .mpd                                | application/vnd.ms-project              | .mpe       | video/x-mpeg                        |
| .mpeg                               | video/mpg                               | .mpg       | video/mpg                           |
| .mpga                               | audio/rn-mpeg                           | .mpp       | application/vnd.ms-project          |
| .mps                                | video/x-mpeg                            | .mpt       | application/vnd.ms-project          |
| .mpv                                | video/mpg                               | .mpv2      | video/mpeg                          |
| .mpw                                | application/vnd.ms-project              | .mpx       | application/vnd.ms-project          |
| .mtx                                | text/xml                                | .mxp       | application/x-mmxp                  |
| .net                                | image/pnetvue                           | .nrf       | application/x-nrf                   |
| .nws                                | message/rfc822                          | .odc       | text/x-ms-odc                       |
| .out                                | application/x-out                       | .p10       | application/pkcs10                  |
| .p12                                | application/x-pkcs12                    | .p7b       | application/x-pkcs7-certificates    |
| .p7c                                | application/pkcs7-mime                  | .p7m       | application/pkcs7-mime              |
| .p7r                                | application/x-pkcs7-certreqresp         | .p7s       | application/pkcs7-signature         |
| .pc5                                | application/x-pc5                       | .pci       | application/x-pci                   |
| .pcl                                | application/x-pcl                       | .pcx       | application/x-pcx                   |
| .pdf                                | application/pdf                         | .pdf       | application/pdf                     |
| .pdx                                | application/vnd.adobe.pdx               | .pfx       | application/x-pkcs12                |
| .pgl                                | application/x-pgl                       | .pic       | application/x-pic                   |
| .pko                                | application/vnd.ms-pki.pko              | .pl        | application/x-perl                  |
| .plg                                | text/html                               | .pls       | audio/scpls                         |
| .plt                                | application/x-plt                       | .png       | image/png                           |
| .png                                | application/x-png                       | .pot       | application/vnd.ms-powerpoint       |
| .ppa                                | application/vnd.ms-powerpoint           | .ppm       | application/x-ppm                   |
| .pps                                | application/vnd.ms-powerpoint           | .ppt       | application/vnd.ms-powerpoint       |
| .ppt                                | application/x-ppt                       | .pr        | application/x-pr                    |
| .prf                                | application/pics-rules                  | .prn       | application/x-prn                   |
| .prt                                | application/x-prt                       | .ps        | application/x-ps                    |
| .ps                                 | application/postscript                  | .ptn       | application/x-ptn                   |
| .pwz                                | application/vnd.ms-powerpoint           | .r3t       | text/vnd.rn-realtext3d              |
| .ra                                 | audio/vnd.rn-realaudio                  | .ram       | audio/x-pn-realaudio                |
| .ras                                | application/x-ras                       | .rat       | application/rat-file                |
| .rdf                                | text/xml                                | .rec       | application/vnd.rn-recording        |
| .red                                | application/x-red                       | .rgb       | application/x-rgb                   |
| .rjs                                | application/vnd.rn-realsystem-rjs       | .rjt       | application/vnd.rn-realsystem-rjt   |
| .rlc                                | application/x-rlc                       | .rle       | application/x-rle                   |
| .rm                                 | application/vnd.rn-realmedia            | .rmf       | application/vnd.adobe.rmf           |
| .rmi                                | audio/mid                               | .rmj       | application/vnd.rn-realsystem-rmj   |
| .rmm                                | audio/x-pn-realaudio                    | .rmp       | application/vnd.rn-rn_music_package |
| .rms                                | application/vnd.rn-realmedia-secure     | .rmvb      | application/vnd.rn-realmedia-vbr    |
| .rmx                                | application/vnd.rn-realsystem-rmx       | .rnx       | application/vnd.rn-realplayer       |
| .rp                                 | image/vnd.rn-realpix                    | .rpm       | audio/x-pn-realaudio-plugin         |
| .rsml                               | application/vnd.rn-rsml                 | .rt        | text/vnd.rn-realtext                |
| .rtf                                | application/msword                      | .rtf       | application/x-rtf                   |
| .rv                                 | video/vnd.rn-realvideo                  | .sam       | application/x-sam                   |
| .sat                                | application/x-sat                       | .sdp       | application/sdp                     |
| .sdw                                | application/x-sdw                       | .sit       | application/x-stuffit               |
| .slb                                | application/x-slb                       | .sld       | application/x-sld                   |
| .slk                                | drawing/x-slk                           | .smi       | application/smil                    |
| .smil                               | application/smil                        | .smk       | application/x-smk                   |
| .snd                                | audio/basic                             | .sol       | text/plain                          |
| .sor                                | text/plain                              | .spc       | application/x-pkcs7-certificates    |
| .spl                                | application/futuresplash                | .spp       | text/xml                            |
| .ssm                                | application/streamingmedia              | .sst       | application/vnd.ms-pki.certstore    |
| .stl                                | application/vnd.ms-pki.stl              | .stm       | text/html                           |
| .sty                                | application/x-sty                       | .svg       | text/xml                            |
| .swf                                | application/x-shockwave-flash           | .tdf       | application/x-tdf                   |
| .tg4                                | application/x-tg4                       | .tga       | application/x-tga                   |
| .tif                                | image/tiff                              | .tif       | application/x-tif                   |
| .tiff                               | image/tiff                              | .tld       | text/xml                            |
| .top                                | drawing/x-top                           | .torrent   | application/x-bittorrent            |
| .tsd                                | text/xml                                | .txt       | text/plain                          |
| .uin                                | application/x-icq                       | .uls       | text/iuls                           |
| .vcf                                | text/x-vcard                            | .vda       | application/x-vda                   |
| .vdx                                | application/vnd.visio                   | .vml       | text/xml                            |
| .vpg                                | application/x-vpeg005                   | .vsd       | application/vnd.visio               |
| .vsd                                | application/x-vsd                       | .vss       | application/vnd.visio               |
| .vst                                | application/vnd.visio                   | .vst       | application/x-vst                   |
| .vsw                                | application/vnd.visio                   | .vsx       | application/vnd.visio               |
| .vtx                                | application/vnd.visio                   | .vxml      | text/xml                            |
| .wav                                | audio/wav                               | .wax       | audio/x-ms-wax                      |
| .wb1                                | application/x-wb1                       | .wb2       | application/x-wb2                   |
| .wb3                                | application/x-wb3                       | .wbmp      | image/vnd.wap.wbmp                  |
| .wiz                                | application/msword                      | .wk3       | application/x-wk3                   |
| .wk4                                | application/x-wk4                       | .wkq       | application/x-wkq                   |
| .wks                                | application/x-wks                       | .wm        | video/x-ms-wm                       |
| .wma                                | audio/x-ms-wma                          | .wmd       | application/x-ms-wmd                |
| .wmf                                | application/x-wmf                       | .wml       | text/vnd.wap.wml                    |
| .wmv                                | video/x-ms-wmv                          | .wmx       | video/x-ms-wmx                      |
| .wmz                                | application/x-ms-wmz                    | .wp6       | application/x-wp6                   |
| .wpd                                | application/x-wpd                       | .wpg       | application/x-wpg                   |
| .wpl                                | application/vnd.ms-wpl                  | .wq1       | application/x-wq1                   |
| .wr1                                | application/x-wr1                       | .wri       | application/x-wri                   |
| .wrk                                | application/x-wrk                       | .ws        | application/x-ws                    |
| .ws2                                | application/x-ws                        | .wsc       | text/scriptlet                      |
| .wsdl                               | text/xml                                | .wvx       | video/x-ms-wvx                      |
| .xdp                                | application/vnd.adobe.xdp               | .xdr       | text/xml                            |
| .xfd                                | application/vnd.adobe.xfd               | .xfdf      | application/vnd.adobe.xfdf          |
| .xhtml                              | text/html                               | .xls       | application/vnd.ms-excel            |
| .xls                                | application/x-xls                       | .xlw       | application/x-xlw                   |
| .xml                                | text/xml                                | .xpl       | audio/scpls                         |
| .xq                                 | text/xml                                | .xql       | text/xml                            |
| .xquery                             | text/xml                                | .xsd       | text/xml                            |
| .xsl                                | text/xml                                | .xslt      | text/xml                            |
| .xwd                                | application/x-xwd                       | .x_b       | application/x-x_b                   |
| .sis                                | application/vnd.symbian.install         | .sisx      | application/vnd.symbian.install     |
| .x_t                                | application/x-x_t                       | .ipa       | application/vnd.iphone              |
| .apk                                | application/vnd.android.package-archive | .xap       | application/x-silve                 |

#### 4.robots协议

url添加/robot.txt

#### 5.index备份

文章：

https://blog.csdn.net/Karol_agan/article/details/105971293

https://blog.csdn.net/Karol_agan/article/details/105971293

在网络安全和渗透测试中，寻找备份文件是一个常见的任务。**index.php** 文件的备份文件名通常会有一些常见的后缀，如 *.bak*、*.old*、*.backup* 等。

示例

例如，如果你想查找 *index.php* 的备份文件，可以尝试以下 URL：

```
http://example.com/index.php.bak

http://example.com/index.php.old

http://example.com/index.php.backup
```

这些 URL 可能会返回备份文件的内容，从而暴露敏感信息。

**注意事项**

**安全性**：确保你的服务器上没有未删除的备份文件，以防止敏感信息泄露。**扫描工具**：可以使用目录扫描工具如 *dirsearch* 来自动化查找备份文件。

#### 6.cookie组成

cookie和set-cookie的区别

Cookie是由网络服务器存储在你电脑硬盘上的一个txt类型的小文件，它和你的网络浏览行为有关，所以存储在你电脑上的Cookie就好像你的一张身份证，你电脑上的Cookie和其他电脑上的Cookie是不一样的；Cookie不能被视作代码执行，也不能成为病毒，所以它对你基本无害。

set-cookie() 函数向客户端发送一个 HTTP cookie。cookie 是由服务器发送到浏览器的变量。cookie 通常是服务器嵌入到用户计算机中的小文本文件。每当计算机通过浏览器请求一个页面，就会发送这个 cookie。
https://blog.csdn.net/qq_54929891/article/details/119873148

cookie构成

比如说

```
Hm_lvt_648a44a949074de73151ffaa0a832aec=1762924081,1762924144,1762950710,1763020694;

 _ga=GA1.2.1076542830.1761323451; _ga_E03P28539Z=GS2.2.s1761323451$o1$g0$t1761323451$j60$l0$h0; 

PHPSESSID=f4cef9175c198cfa94239cdcae7339d0
```

这些 Cookie 的含义和作用可以分类型解析：

1. Hm_lvt_648a44a949074de73151ffaa0a832aec

这是网站统计工具（如百度统计）的 Cookie，用于记录用户首次访问、后续访问的时间戳（如`1762924081`等是 Unix 时间戳，可转换为具体日期），帮助网站分析用户的访问频次和行为路径。

2. _ga 和 _ga_E03P28539Z

这是Google Analytics（谷歌分析）的 Cookie，用于跟踪用户的访问行为：

- _ga是用户的唯一标识，记录首次访问的时间和设备信息；
- _ga_E03P28539Z 是针对特定站点的会话跟踪，记录用户的会话状态（如是否为新访客、会话时长等）。

3. PHPSESSID

这是PHP 会话标识，是 Web 应用保持用户状态的核心：

- 服务器通过这个唯一 ID 识别用户，存储登录状态、权限信息等敏感数据（数据存在服务器端，Cookie 仅存 ID）；
- 例如你登录后能保持身份，就是靠它在请求间传递会话信息。

这些 Cookie 组合起来，既实现了**用户行为分析**（统计和谷歌分析），又保证了**登录态的持续有效**（PHPSESSID），是 Web 应用跟踪用户和维持交互的典型配置。

#### 7.初始页面

一般来说web的首页都是index或者defualt···；

#### 8.目录爆破

12.disearch

常见Payload

1.扫描单个URL，并限制线程数和扩展名：

```
python dirsearch.py -u http://example.com -t 10 -e php,asp --exclude-extensions=html
```

该命令将对 `http://example.com` 进行目录扫描，使用最多 10 个线程并仅检查扩展名为 `php` 和 `asp` 的路径，同时排除扩展名为 `html` 的路径。

2.从URL列表文件中批量扫描：

```
python dirsearch.py -l urls.txt -t 5 -e php
```

该命令将从 `urls.txt` 文件中读取目标URL列表，并使用最多 5 个线程对每个URL进行目录扫描，仅检查扩展名为 `php` 的路径。

3.使用自定义字典和深度递归扫描：

```
python dirsearch.py -u http://example.com -w custom-wordlist.txt -r --deep-recursive
```

该命令将对 `http://example.com` 进行目录扫描，使用自定义的单词列表文件 `custom-wordlist.txt`，并启用深度递归扫描，即在每个目录的所有深度上执行递归扫描。

4.在请求中使用自定义HTTP头：

```
python dirsearch.py -u http://example.com -H "X-Custom-Header: Value" -H "Authorization: Bearer toke
```

该命令将对 `http://example.com` 进行目录扫描，并在每个请求中包含自定义的HTTP头，如 `X-Custom-Header` 和 `Authorization`。

5.指定线程数和延迟时间：

```
python dirsearch.py -u http://example.com -t 20 --delay 0.5
```

上述命令将使用20个线程并设置每个请求之间的延迟为0.5秒。

6.使用自定义的请求头和超时时间：

```
python dirsearch.py -u http://example.com -H "Custom-Header: value" --timeout 10
```

这个命令将在每个请求中添加一个自定义的请求头 “Custom-Header: value”，并将超时时间设置为10秒。

7.包含和排除特定状态码：

```
python dirsearch.py -u http://example.com -i 200,302 -x 404,500
```

上述命令将只包含状态码为200和302的响应，并排除状态码为404和500的响应。

8.使用代理进行扫描：

```
python dirsearch.py -u http://example.com -p http://127.0.0.1:8080
```

这个命令将通过指定的HTTP代理（例如Burp Suite）对目标URL进行扫描。

9.保存输出到文件中：

```
python dirsearch.py -u http://example.com -o output.txt
```

上述命令将扫描结果输出到指定的文件 `output.txt`。

10.使用代理链进行扫描：

```
python dirsearch.py -u http://example.com -p http://proxy1:8080 -p http://proxy2:8080
```

上述命令将通过两个代理服务器 `proxy1` 和 `proxy2` 进行目标URL的扫描。

11.从标准输入读取URL：

```
cat urls.txt | python dirsearch.py --stdin -t 10
```

这个命令通过管道从 `urls.txt` 中读取URL，并使用最多 10 个线程对每个URL进行目录扫描。

12.启用递归扫描和重定向跟随：

```
python dirsearch.py -u http://example.com -r -F
```

上述命令将启用目录的递归扫描，并且在扫描时跟随HTTP重定向。

13.排除指定大小范围的响应：

```
python dirsearch.py -u http://example.com --exclude-sizes 0-100B,500KB-1MB
```

该命令将排除大小在 0 到 100 字节以及 500千字节到 1 兆字节范围内的响应。

14.设定最大运行时间和最大重试次数：

```
python dirsearch.py -u http://example.com --max-time 300 --retries 5
```

上述命令将设置最长运行时间为 300 秒，并允许失败请求最多重试 5 次。

15.指定自定义的User-Agent头：

```
python dirsearch.py -u http://example.com --user-agent "Custom User Agent"
```

上述命令将在HTTP请求中指定自定义的User-Agent头。

16.使用代理认证进行扫描：

```
python dirsearch.py -u http://example.com -p http://proxy.example.com --proxy-auth "username:password"
```

这个命令将使用指定的代理服务器 `proxy.example.com` 进行扫描，并提供代理认证的用户名和密码。

17.启用递归扫描并限制最大递归深度：

```
python dirsearch.py -u http://example.com -r -R 5
```

上述命令将启用递归目录扫描，并限制最大递归深度为5层。

18.排除特定文本出现的响应：

```
python dirsearch.py -u http://example.com --exclude-text "Not Found" --exclude-text "Error"
```

该命令将排除响应中包含指定文本（如 “Not Found” 和 “Error”）的路径。

19.设置最小和最大响应长度：

```
python dirsearch.py -u http://example.com --min-response-size 1000 --max-response-size 50000
```

上述命令将只包含响应长度在1000到50000字节之间的路径。



典例

```
python dirsearch.py -u http://xxxx        //日常使用

python dirsearch.py -u http://xxxx -r        //递归扫描，不过容易被检测

python dirsearch.py -u http://xxxx -r -t 30        //线程控制请求速率

python dirsearch.py -u http://xxxx -r -t 30 --proxy 127.0.0.1:8080        //使用代理
```

#### 9.源码查看

```
F12
ctrl+U
ctrl+shift+I
url后面加view sourse
浏览器自带工具直接看
```

#### 10.html实体编码

alert

&#102;&#108;&#97;&#103;&#123;&#56;&#51;&#52;&#101;&#52;&#100;&#101;&#98;&#49;&#97;&#48;&#53;&#98;&#48;&#54;&#49;&#48;&#54;&#55;&#54;&#48;&#99;&#54;&#50;&#48;&#99;&#53;&#56;&#49;&#49;&#54;&#50;&#125; 

![1765465652077](1765465652077.png)

**HTML 字符实体编码**

#### 11.密码爆破（何为成功）

密码判断为正确的标志

302重定向跳转

要判断这些是密码，可从**请求结构、爆破场景、HTTP 状态码**三个维度分析：

1. 请求结构：明确的账号密码参数

截图中请求体包含 `username=admin&password=NSSLOVE` 这类键值对，这是 Web 登录场景中**标准的账号密码提交格式**，直接说明这些字符串是用于验证身份的 “密码候选”。

2. 爆破场景：批量尝试不同字符串

列表中出现 `NSSLOVE`、`pearl`、`pepsi` 等多个不同字符串，且请求编号连续（7096-7103），符合**密码字典爆破的特征**—— 通过批量枚举可能的密码，尝试登录系统。

3. HTTP 状态码：302 代表登录成功的信号

所有请求的状态码都是 `302`，结合 Web 安全中 “登录爆破” 的常识：

- `302` 是**临时重定向状态码**，在登录场景中通常表示 “认证成功，跳转到登录后页面”；

- 若密码错误，一般会返回

  ```
  200
  ```

  （停留在登录页）或其他状态码。

  **thus**，这些被批量尝试的字符串，是用于验证 “哪个能让系统返回 302 重定向” 的

  密码字典。

简单来说，“账号密码参数格式 + 批量字典尝试 + 302 重定向响应”，这三个特征共同说明这些字符串是在进行**密码爆破测试**，列表中的内容就是候选密码。

#### 12.via请求头

#### 13.\r\n(CRLF)注入

原理：https://www.cnblogs.com/mysticbinary/p/12560080.html

# HTTP Authorization头

[HTTP Authorization ](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization)头是一个用于在客户端与服务器之间传送认证凭证的 HTTP 请求头。它允许用户代理（比如 web 浏览器）向服务器提供身份验证信息，以响应服务器的身份验证请求。这类请求一般出现在服务器需要验证请求者是否有权访问某个资源时。Authorization 头是 HTTP 协议中定义的标准字段之一，其值通常包含凭证信息，如用户名和密码，或者是一个令牌，如 OAuth 或 JWT（JSON Web Token）。

在 Web 安全领域，HTTP Authorization 头扮演着至关重要的角色。通过利用这个头部，服务器能够确保只有授权的用户可以访问敏感数据或执行特定的操作。无论是普通的网页访问、网页应用程序、API 调用还是其他基于 HTTP 的交互，避免未授权访问是维护系统安全的关键组成部分。如果 Authorization 头中的凭证泄露或被不正确处理，可能会导致安全漏洞，如身份盗用或数据泄漏，从而威胁到整个 Web 应用程序的安全和用户的隐私。

### Authorization 头的定义和作用


HTTP Authorization 请求头部主要用于客户端向服务端传递用户认证凭据，如用户名和密码等。其格式通常是：

```plain
Authorization: <type> <credentials>
```

其中`<type>`是认证类型，代表了使用的认证方案，而`<credentials>`是认证凭据信息。当 Web 服务器需要验证客户端请求访问的资源是否有权限时，通常会在响应的 HTTP 401 Unauthorized 状态中包含一个`WWW-Authenticate`响应头来提示客户端进行认证。此时，客户端在后续的请求中会使用`Authorization`头部提供必要的认证信息。

### 如何使用 Authorization 头进行用户认证


要使用`Authorization`头进行用户认证，客户端首先需要知道服务器所需的认证类型，这通常通过服务器的`WWW-Authenticate`头在 401 响应中给出。然后，客户端将根据认证类型构造相应的凭据。


例如，如果采用基本认证（Basic Authentication），凭据将是用户名和密码的组合，经过 Base64 编码后的字符串。客户端将这个编码后的凭据放入`Authorization`头并发送回服务器进行认证。

### 不同认证机制简介

#### 基本认证（Basic Authentication）


基本认证是最简单的 HTTP 认证机制。它通过用户代理发送一个经过 Base64 编码的`用户名:密码`字符串来工作。尽管实现简单，但基本认证通常不被认为是安全的，因为 Base64 编码非常容易解码，故一般配合 HTTPS 使用以确保安全性。

#### 摘要认证（Digest Authentication）


摘要认证在安全性上比基本认证更高一步，因为它使用了 MD5 散列函数来传输密码。尽管比基本认证更为安全，但摘要认证也有一些安全漏洞，并且在现代 Web 应用中不如其他认证机制流行。

#### Token 认证，如 Bearer 令牌（Token Authentication）


Token 认证是一种更为安全的认证方法，广泛用于当前的 Web 应用中，特别是在 RESTful API 认证中。一个常见的实施方式是使用 Bearer tokens，客户端发送一个密钥（token），它由服务器验证且通常是持有密钥用户识别令牌。

#### OAuth


OAuth 是一个用于授权的开放标准，它允许用户让第三方应用访问自己存储在另一服务提供商上的信息，而无需将用户名和密码直接提供给第三方应用。OAuth 可以用来提供认证（OAuth 2.0）和授权，例如允许应用代表用户去访问 Google 或 Facebook 上的数据。

#### API 密钥（API Keys）


API 密钥是由服务器预先生成的一组字符，客户端将其作为访问 API 资源的凭据。API 密钥通常作为请求的一部分发送，可以放在 URL、请求头或请求体中。虽然 API 密钥方便易用，但比较适用于对安全需求不是特别高的场景，且通常与其他手段（如限制 IP 地址）结合使用来增加安全性。

# http请求走私

```

```





# git

git
wget看服务器资源,

git reflog看引用资源,

git show命令

