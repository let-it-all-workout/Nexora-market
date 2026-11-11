export function formatDateTick(value) {
  const text = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    const local = new Date(year, month - 1, day);
    if (!Number.isNaN(local.getTime())) {
      return local.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    }
  }
  const instant = new Date(text);
  if (Number.isNaN(instant.getTime())) return text;
  return instant.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
