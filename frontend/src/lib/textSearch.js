export function compactSearchText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function matchesSearch(query, ...fields) {
  const raw = String(query || '').trim().toLowerCase();
  if (!raw) return false;
  const compact = compactSearchText(raw);
  return fields.some((field) => {
    const text = String(field || '').toLowerCase();
    if (text.includes(raw)) return true;
    return compact.length >= 2 && compactSearchText(text).includes(compact);
  });
}

export function searchRank(query, { symbol = '', name = '', id = '' } = {}) {
  const q = String(query || '').trim().toLowerCase();
  const compact = compactSearchText(q);
  const s = String(symbol || '').toLowerCase();
  const n = String(name || '').toLowerCase();
  const i = String(id || '').toLowerCase();
  if (s === q || compactSearchText(s) === compact) return 0;
  if (s.startsWith(q) || compactSearchText(s).startsWith(compact)) return 1;
  if (n.startsWith(q) || i.startsWith(q)) return 2;
  return 3;
}
