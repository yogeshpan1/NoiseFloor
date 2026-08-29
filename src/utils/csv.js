function cell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(rows, columns) {
  const cols = columns && columns.length ? columns : rows.length ? Object.keys(rows[0]) : [];
  const header = cols.map((c) => cell(c.label ?? c.key ?? c)).join(',');
  const body = rows
    .map((r) => cols.map((c) => cell(r[c.key ?? c])).join(','))
    .join('\n');
  return header + '\n' + body;
}

export function downloadCSV(filename, csv) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
