// 极简但真实的 XML 解析器（无第三方依赖）：
// 支持 XML 声明、注释、CDATA、实体解码、属性、命名空间前缀。
// 用于验收 RSS 结构，而不是用正则"假装"解析。
// 注意：这是测试工具，必须能识别格式错误（未闭合、错配、裸 &）。

export function parseXml(source) {
  const text = source.replace(/^\uFEFF/, '');
  const root = { name: '#document', attrs: {}, children: [], text: '' };
  const stack = [root];
  let i = 0;
  const errors = [];

  const decodeEntities = (s) => s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, e) => {
    if (e === 'amp') return '&';
    if (e === 'lt') return '<';
    if (e === 'gt') return '>';
    if (e === 'quot') return '"';
    if (e === 'apos') return "'";
    if (e.startsWith('#x')) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith('#')) return String.fromCodePoint(parseInt(e.slice(1), 10));
    return m;
  });

  while (i < text.length) {
    const lt = text.indexOf('<', i);
    if (lt === -1) {
      const tail = text.slice(i);
      if (tail.trim()) stack[stack.length - 1].text += decodeEntities(tail);
      break;
    }
    if (lt > i) {
      const chunk = text.slice(i, lt);
      // 裸 & 检测（未成实体）
      const bareAmp = /&(?!(?:#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);)/.exec(chunk);
      if (bareAmp) errors.push(`裸 & 出现在位置 ${i + bareAmp.index}`);
      stack[stack.length - 1].text += decodeEntities(chunk);
    }

    // 注释
    if (text.startsWith('<!--', lt)) {
      const end = text.indexOf('-->', lt + 4);
      if (end === -1) { errors.push('未闭合的注释'); break; }
      i = end + 3;
      continue;
    }
    // CDATA
    if (text.startsWith('<![CDATA[', lt)) {
      const end = text.indexOf(']]>', lt + 9);
      if (end === -1) { errors.push('未闭合的 CDATA'); break; }
      stack[stack.length - 1].text += text.slice(lt + 9, end);
      i = end + 3;
      continue;
    }
    // 声明 / DOCTYPE
    if (text.startsWith('<?', lt)) {
      const end = text.indexOf('?>', lt + 2);
      if (end === -1) { errors.push('未闭合的处理指令'); break; }
      i = end + 2;
      continue;
    }
    if (text.startsWith('<!', lt)) {
      const end = text.indexOf('>', lt + 2);
      if (end === -1) { errors.push('未闭合的 DOCTYPE'); break; }
      i = end + 1;
      continue;
    }
    // 结束标签
    if (text[lt + 1] === '/') {
      const end = text.indexOf('>', lt);
      if (end === -1) { errors.push('未闭合的结束标签'); break; }
      const name = text.slice(lt + 2, end).trim();
      const top = stack[stack.length - 1];
      if (top.name !== name) {
        errors.push(`标签错配: 期望 </${top.name}> 实际 </${name}>`);
        break;
      }
      stack.pop();
      i = end + 1;
      continue;
    }
    // 开始标签
    const end = text.indexOf('>', lt);
    if (end === -1) { errors.push('未闭合的开始标签'); break; }
    const raw = text.slice(lt + 1, end);
    const selfClosing = raw.endsWith('/');
    const body = selfClosing ? raw.slice(0, -1) : raw;
    const nameMatch = /^([^\s/>]+)/.exec(body);
    if (!nameMatch) { errors.push('无效标签'); break; }
    const name = nameMatch[1];
    const attrs = {};
    for (const m of body.slice(name.length).matchAll(/([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
      attrs[m[1]] = decodeEntities(m[3] ?? m[4] ?? '');
    }
    const node = { name, attrs, children: [], text: '' };
    stack[stack.length - 1].children.push(node);
    if (!selfClosing) stack.push(node);
    i = end + 1;
  }

  if (stack.length !== 1) errors.push(`未闭合的标签栈: ${stack.map((n) => n.name).join(' > ')}`);
  return { root, errors };
}

export function findAll(node, name, acc = []) {
  for (const child of node.children) {
    if (child.name === name) acc.push(child);
    findAll(child, name, acc);
  }
  return acc;
}

export function findFirst(node, name) {
  return findAll(node, name)[0] || null;
}

/** 文本内容（含子节点文本拼接） */
export function textOf(node) {
  if (!node) return '';
  return node.text + node.children.map(textOf).join('');
}
