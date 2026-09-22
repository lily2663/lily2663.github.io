import { isObject } from './value.mjs';

function validationError(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function validProfileLink(input) {
  try {
    const url = new URL(input);
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

export function validateProfile(value) {
  if (!isObject(value)) throw validationError('个人资料无效。');
  const author = typeof value.author === 'string' ? value.author.trim() : '';
  const aboutTitle = typeof value.aboutTitle === 'string' ? value.aboutTitle.trim() : '';
  if (!author || author.length > 80 || aboutTitle.length > 80) throw validationError('作者名或关于页标题长度无效。');
  if (!Array.isArray(value.about) || value.about.length > 20 || value.about.some((item) => typeof item !== 'string' || item.length > 500)) throw validationError('简介段落无效。');
  if (!Array.isArray(value.links) || value.links.length > 30) throw validationError('社交链接列表无效。');
  const links = value.links.map((link, index) => {
    const label = typeof link?.label === 'string' ? link.label.trim() : '';
    const url = typeof link?.url === 'string' ? link.url.trim() : '';
    if (!label || label.length > 60 || !validProfileLink(url)) throw validationError(`第 ${index + 1} 条社交链接无效。`);
    return { label, url };
  });
  return { author, aboutTitle, about: value.about.map((item) => item.trim()).filter(Boolean), links };
}

export function validateFriends(value) {
  if (!Array.isArray(value) || value.length > 200) throw validationError('友链列表无效或超过 200 条。');
  const urls = new Set();
  return value.map((friend, index) => {
    if (!isObject(friend)) throw validationError(`第 ${index + 1} 条友链无效。`);
    const name = typeof friend.name === 'string' ? friend.name.trim() : '';
    const url = typeof friend.url === 'string' ? friend.url.trim() : '';
    const desc = typeof friend.desc === 'string' ? friend.desc.trim() : '';
    const avatar = typeof friend.avatar === 'string' ? friend.avatar.trim() : '';
    if (!name || name.length > 80 || desc.length > 240) throw validationError(`第 ${index + 1} 条友链的名称或简介长度无效。`);
    const validRemote = (input) => {
      try {
        const parsed = new URL(input);
        return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
      } catch { return false; }
    };
    if (!validRemote(url)) throw validationError(`第 ${index + 1} 条友链需要 http(s) 网站地址。`);
    if (avatar && !validRemote(avatar) && !/^\/(?!\/)[^\s?#]+(?:\?[^\s#]*)?$/.test(avatar)) throw validationError(`第 ${index + 1} 条友链的头像地址无效。`);
    const key = new URL(url).href;
    if (urls.has(key)) throw validationError(`第 ${index + 1} 条友链的网站地址重复。`);
    urls.add(key);
    return { name, url, desc, avatar };
  });
}
