import { useMemo, useState } from 'react';
import { ChevronUpIcon, ChevronDownIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { toCSV, downloadCSV } from '../../utils/csv';

/**
 * Generic sortable + searchable + CSV-exportable table. Feeds Data Explorer,
 * Trends' country heatmap, Date Explorer's tagged-events table and Neighbour
 * Watch's matrix — they differ only in `columns`/`colorScale`, not in this
 * sort/search/export mechanics.
 */
export default function DataTable({
  columns,
  rows,
  searchable = false,
  searchKeys,
  exportFilename,
  colorScale,
  emptyState,
  pageSize = 100,
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(null); // { key, dir: 1|-1 }

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    const keys = searchKeys || columns.map((c) => c.key);
    return rows.filter((r) => keys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
  }, [rows, query, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const { key, dir } = sort;
    return [...filtered].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sort]);

  const shown = sorted.slice(0, pageSize);

  const toggleSort = (key, sortable) => {
    if (sortable === false) return;
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 1 };
      if (prev.dir === 1) return { key, dir: -1 };
      return null;
    });
  };

  const handleExport = () => {
    const csv = toCSV(sorted, columns);
    downloadCSV(exportFilename || 'noiseui-export.csv', csv);
  };

  if (!rows.length && emptyState) return emptyState;

  return (
    <div>
      {(searchable || exportFilename) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {searchable && (
            <div className="relative w-full max-w-xs">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-lg border border-white/10 bg-bg-secondary py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-gold/40 focus:outline-none"
              />
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span>
              {sorted.length.toLocaleString()} row{sorted.length === 1 ? '' : 's'}
              {shown.length < sorted.length ? ` — showing first ${shown.length}` : ''}
            </span>
            {exportFilename && (
              <button
                type="button"
                onClick={handleExport}
                className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/10 bg-bg-card px-3 py-1.5 font-medium text-gold-bright transition-colors hover:border-gold/40"
              >
                <ArrowDownTrayIcon className="h-3.5 w-3.5" /> CSV
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[600px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-bg-secondary">
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key, c.sortable)}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary ${
                    c.align === 'right' ? 'text-right' : 'text-left'
                  } ${c.sortable === false ? '' : 'cursor-pointer select-none hover:text-text-primary'}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sort?.key === c.key &&
                      (sort.dir === 1 ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-text-secondary">
                  No rows match.
                </td>
              </tr>
            ) : (
              shown.map((r, i) => (
                <tr key={r.id ?? i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                  {columns.map((c) => {
                    const v = r[c.key];
                    const bg = colorScale && colorScale.key === c.key ? colorScale.fn(v) : undefined;
                    return (
                      <td
                        key={c.key}
                        style={bg ? { backgroundColor: bg } : undefined}
                        className={`px-4 py-2.5 font-mono text-xs text-text-primary ${c.align === 'right' ? 'text-right' : ''}`}
                      >
                        {c.render ? c.render(v, r) : v ?? '—'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
