import path from 'node:path';
import { inflateSync } from 'node:zlib';

export function createHttpPrimitives({ port, maxBodyBytes, maxDecodedImageBytes }) {
  function httpError(status, message) {
    const error = new Error(message);
    error.statusCode = status;
    return error;
  }

  function adminOriginAllowed(request) {
    const origin = request.headers.origin;
    const fetchSite = request.headers['sec-fetch-site'];
    if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) return false;
    if (!origin) return true;
    return origin === `http://127.0.0.1:${port}` || origin === `http://localhost:${port}`;
  }

  function staticSecurityHeaders(target) {
    const extension = path.extname(target).toLowerCase();
    return {
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'same-origin',
      'x-frame-options': 'DENY',
      'cross-origin-resource-policy': 'same-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'content-security-policy': extension === '.html'
        ? "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'self'"
        : "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; sandbox",
    };
  }

  function isValidPng(bytes) {
    if (!bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return false;
    let offset = 8; let sawHeader = false; let sawEnd = false;
    const compressed = [];
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset); const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
      const start = offset + 8; const end = start + length;
      if (end + 4 > bytes.length) return false;
      if (type === 'IHDR') { if (sawHeader || length !== 13) return false; sawHeader = true; }
      if (type === 'IDAT') compressed.push(bytes.subarray(start, end));
      if (type === 'IEND') { if (length !== 0) return false; sawEnd = true; offset = end + 4; break; }
      offset = end + 4;
    }
    if (!sawHeader || !sawEnd || !compressed.length || offset !== bytes.length) return false;
    try { inflateSync(Buffer.concat(compressed), { maxOutputLength: maxDecodedImageBytes }); return true; }
    catch { return false; }
  }

  function hasExpectedImageSignature(bytes, extension) {
    if (!Buffer.isBuffer(bytes) || bytes.length < 12) return false;
    const ext = extension.toLowerCase();
    if (ext === '.png') return isValidPng(bytes);
    if (ext === '.jpg' || ext === '.jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (ext === '.gif') return bytes.subarray(0, 6).toString('ascii') === 'GIF87a' || bytes.subarray(0, 6).toString('ascii') === 'GIF89a';
    if (ext === '.webp') return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    if (ext === '.avif') return bytes.subarray(4, 8).toString('ascii') === 'ftyp' && bytes.subarray(8, 12).toString('ascii').startsWith('avi');
    return false;
  }

  function send(response, status, payload, headers = {}) {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    response.writeHead(status, {
      'content-type': typeof payload === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'same-origin',
      'x-frame-options': 'DENY',
      'cross-origin-resource-policy': 'same-origin',
      ...headers,
    });
    response.end(body);
  }

  function fail(response, status, message) {
    send(response, status, { error: message });
  }

  async function readBody(request, limit = maxBodyBytes) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > limit) throw new Error('请求内容过大。');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  return { adminOriginAllowed, fail, hasExpectedImageSignature, httpError, readBody, send, staticSecurityHeaders };
}
