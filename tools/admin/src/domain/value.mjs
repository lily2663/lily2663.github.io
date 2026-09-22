import YAML from 'yaml';

export function scalar(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map((item) => scalar(item)).filter(Boolean);
  }
  return value.replace(/^(['"])(.*)\1$/, '$2');
}

export function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseYaml(raw, label) {
  const document = YAML.parseDocument(raw, { prettyErrors: true, uniqueKeys: true });
  if (document.errors.length) throw new Error(`${label} YAML 无效：${document.errors[0].message}`);
  const value = document.toJS({ mapAsMap: false });
  if (!isObject(value)) throw new Error(`${label} 必须是 YAML 对象。`);
  return value;
}
