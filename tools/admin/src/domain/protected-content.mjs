import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'node:crypto';

function invalidProtectedContent(message) {
  return Object.assign(new Error(message), { status: 400 });
}

export function encryptProtectedBody(id, body, password) {
  const salt = randomBytes(16), iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, 600000, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(body, 'utf8'), cipher.final()]);
  return {
    version: 2, pageId: id,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600000, salt: salt.toString('base64') },
    cipher: { name: 'AES-256-GCM', iv: iv.toString('base64'), data: data.toString('base64'), tag: cipher.getAuthTag().toString('base64') },
  };
}

export function decryptProtectedBody(payload, password) {
  if (payload.version !== 2 || payload.kdf?.iterations !== 600000 || payload.cipher?.name !== 'AES-256-GCM') {
    throw invalidProtectedContent('加密文章格式不受支持。');
  }
  try {
    const key = pbkdf2Sync(password, Buffer.from(payload.kdf.salt, 'base64'), 600000, 32, 'sha256');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.cipher.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.cipher.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(payload.cipher.data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    throw invalidProtectedContent('密码错误或加密文章已损坏。');
  }
}
